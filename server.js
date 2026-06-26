const express = require('express');
const compression = require('compression');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'data', 'planilla-pda.json');
const CORTE_PASSWORD = process.env.CORTE_PASSWORD || 'Finanzas$2026';

let lastWrite = Promise.resolve();

if (IS_PROD) {
  app.set('trust proxy', 1);
  app.use(compression());
}
app.use(cors());
app.use(express.json({ limit: '20mb' }));

// Evitar cache agresivo del HTML (ayuda a ver cambios al instante en el host)
app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);
    let rows = Array.isArray(data.rows) ? data.rows : [];
    const cortes = Array.isArray(data.cortes) ? data.cortes : [];
    let nextId = Number.isFinite(data.nextId) ? data.nextId : 1;

    let opCounter = Number.isFinite(data.nextOp) ? data.nextOp : 1;
    rows = rows.map((r) => {
      if (!r || typeof r !== 'object') return r;
      if (r.numeroOperacion == null || !Number.isFinite(Number(r.numeroOperacion))) {
        return { ...r, numeroOperacion: opCounter++ };
      }
      opCounter = Math.max(opCounter, Number(r.numeroOperacion) + 1);
      return r;
    });

    const maxId = rows.reduce((m, r) => Math.max(m, Number(r && r.id) || 0), 0);
    nextId = Math.max(nextId, maxId + 1);

    return {
      rows,
      cortes,
      nextId,
      nextOp: opCounter
    };
  } catch (e) {
    return { rows: [], cortes: [], nextId: 1, nextOp: 1 };
  }
}

function writeData(data) {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmp = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, DATA_FILE);
}

function runMutated(fn) {
  return new Promise((resolve, reject) => {
    lastWrite = lastWrite
      .then(() => {
        try {
          const result = fn();
          resolve(result);
        } catch (e) {
          reject(e);
        }
      })
      .catch(reject);
  });
}

app.get('/api/planilla', (req, res) => {
  try {
    const data = readData();
    res.json(data);
  } catch (e) {
    res.status(500).json({ error: 'Error al leer la planilla' });
  }
});

app.post('/api/planilla/fila', (req, res) => {
  const row = req.body;
  if (!row || typeof row !== 'object') {
    return res.status(400).json({ error: 'Cuerpo inválido' });
  }
  runMutated(() => {
    const data = readData();
    if (!Number.isFinite(data.nextOp)) data.nextOp = 1;
    const newRow = { ...row };
    delete newRow.id;
    delete newRow.numeroOperacion;
    newRow.numeroOperacion = data.nextOp++;
    newRow.id = data.nextId++;
    data.rows.push(newRow);
    writeData(data);
    return { row: newRow, nextId: data.nextId, nextOp: data.nextOp };
  })
    .then((data) => res.json(data))
    .catch(() => res.status(500).json({ error: 'Error al guardar la fila' }));
});

app.post('/api/planilla/fila/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const updated = req.body || {};
  runMutated(() => {
    const data = readData();
    const idx = data.rows.findIndex((r) => r.id === id);
    if (idx === -1) {
      return { row: null };
    }
    const original = data.rows[idx];
    const merged = {
      ...original,
      ...updated,
      id: original.id,
      numeroOperacion: original.numeroOperacion
    };
    data.rows[idx] = merged;
    writeData(data);
    return { row: merged };
  })
    .then((result) => res.json(result))
    .catch(() => res.status(500).json({ error: 'Error al actualizar la fila' }));
});

app.post('/api/planilla/corte', (req, res) => {
  const { orden, cantidad, fechaHora } = req.body || {};
  runMutated(() => {
    const data = readData();
    data.cortes.push({
      orden: orden ?? data.cortes.length + 1,
      cantidad: cantidad ?? data.rows.length,
      fechaHora: fechaHora || new Date().toISOString()
    });
    writeData(data);
    return { cortes: data.cortes };
  })
    .then((data) => res.json(data))
    .catch(() => res.status(500).json({ error: 'Error al guardar el corte' }));
});

app.delete('/api/planilla/corte/:orden', (req, res) => {
  const orden = parseInt(req.params.orden, 10);
  if (isNaN(orden)) return res.status(400).json({ error: 'Orden de corte inválido' });
  runMutated(() => {
    const data = readData();
    const antes = data.cortes.length;
    data.cortes = data.cortes.filter((c) => Number(c.orden) !== orden);
    if (data.cortes.length === antes) {
      return { cortes: data.cortes, removed: false };
    }
    writeData(data);
    return { cortes: data.cortes, removed: true };
  })
    .then((data) => res.json(data))
    .catch(() => res.status(500).json({ error: 'Error al eliminar el corte' }));
});

app.put('/api/planilla/cortes', (req, res) => {
  const { cortes: nuevosCortes } = req.body || {};
  if (!Array.isArray(nuevosCortes)) {
    return res.status(400).json({ error: 'Se requiere array cortes' });
  }
  runMutated(() => {
    const data = readData();
    data.cortes = nuevosCortes;
    writeData(data);
    return { cortes: data.cortes };
  })
    .then((data) => res.json(data))
    .catch(() => res.status(500).json({ error: 'Error al actualizar cortes' }));
});

app.delete('/api/planilla/fila/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  runMutated(() => {
    const data = readData();
    data.rows = data.rows.filter((r) => r.id !== id);
    writeData(data);
    return { rows: data.rows };
  })
    .then((data) => res.json(data))
    .catch(() => res.status(500).json({ error: 'Error al eliminar la fila' }));
});

app.post('/api/planilla/finanzas/:id', (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const { finanzas } = req.body || {};
  runMutated(() => {
    const data = readData();
    const idx = data.rows.findIndex((r) => r.id === id);
    if (idx === -1) {
      return { rows: data.rows };
    }
    data.rows[idx].finanzas = typeof finanzas === 'string' ? finanzas : '';
    writeData(data);
    return { row: data.rows[idx] };
  })
    .then((result) => res.json(result))
    .catch(() => res.status(500).json({ error: 'Error al guardar Finanzas' }));
});

app.post('/api/planilla/limpiar', (req, res) => {
  const { password } = req.body || {};
  if (password !== CORTE_PASSWORD) {
    return res.status(403).json({ error: 'Contraseña incorrecta' });
  }
  runMutated(() => {
    const data = readData();
    const nextOp = Number.isFinite(data.nextOp) ? data.nextOp : 1;
    const cleaned = { rows: [], cortes: [], nextId: 1, nextOp };
    writeData(cleaned);
    return cleaned;
  })
    .then((data) => res.json(data))
    .catch(() => res.status(500).json({ error: 'Error al limpiar' }));
});

app.use(
  express.static(__dirname, {
    index: 'index.html',
    maxAge: IS_PROD ? '1d' : 0,
    etag: true
  })
);

const HOST = process.env.HOST || '0.0.0.0';
app.listen(PORT, HOST, () => {
  console.log('\n========================================');
  console.log('Pedidos de pagos PDA - Servidor iniciado');
  if (IS_PROD) console.log('Modo: producción (gzip estático, trust proxy)');
  console.log('========================================');
  console.log(`Escuchando en: ${HOST}:${PORT}`);
  console.log(`Local:  http://localhost:${PORT}`);

  if (!IS_PROD && process.platform === 'win32') {
    try {
      const { execSync } = require('child_process');
      const ipOutput = execSync('ipconfig', { encoding: 'utf8' });
      const ipMatches = ipOutput.match(/IPv4[^\n]*:\s*(\d+\.\d+\.\d+\.\d+)/g);
      if (ipMatches) {
        const ips = ipMatches
          .map((m) => m.match(/(\d+\.\d+\.\d+\.\d+)/)[1])
          .filter((ip) => !ip.startsWith('127.') && !ip.startsWith('169.254.'));
        if (ips.length > 0) {
          console.log('\nAcceso desde la red:');
          ips.forEach((ip) => {
            console.log(`  http://${ip}:${PORT}`);
          });
        }
      }
    } catch (e) {
      // ignorar
    }
  }

  console.log('\n========================================');
  console.log('Si no puedes acceder desde la red, ejecuta:');
  console.log('  .\\configurar_firewall.ps1');
  console.log('(como Administrador)');
  console.log('========================================\n');
});
