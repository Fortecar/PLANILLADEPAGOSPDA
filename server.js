const express = require('express');
const compression = require('compression');
const cors = require('cors');
const db = require('./db');

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;
const CORTE_PASSWORD = process.env.CORTE_PASSWORD || 'Finanzas$2026';

if (IS_PROD) {
  app.set('trust proxy', 1);
  app.use(compression());
}
app.use(cors());
app.use(express.json({ limit: '20mb' }));

app.use((req, res, next) => {
  if (req.path === '/' || req.path.endsWith('.html')) {
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  next();
});

app.get('/api/planilla', async (req, res) => {
  try {
    const mdb = db.getDb();
    const [rows, cortes, counterRow] = await Promise.all([
      mdb.collection('rows').find().toArray(),
      mdb.collection('cortes').find().toArray(),
      mdb.collection('counters').findOne({ _id: 'rowId' }),
    ]);
    const counterOp = await mdb.collection('counters').findOne({ _id: 'opNum' });
    res.json({
      rows,
      cortes,
      nextId: (counterRow?.seq || 0) + 1,
      nextOp: (counterOp?.seq || 0) + 1
    });
  } catch (e) {
    res.status(500).json({ error: 'Error al leer la planilla' });
  }
});

app.post('/api/planilla/fila', async (req, res) => {
  const row = req.body;
  if (!row || typeof row !== 'object') {
    return res.status(400).json({ error: 'Cuerpo inválido' });
  }
  try {
    const mdb = db.getDb();
    const newId = await db.incrementCounter('rowId');
    const newOp = await db.incrementCounter('opNum');
    const newRow = {
      ...row,
      id: newId,
      numeroOperacion: newOp,
    };
    delete newRow._id;
    await mdb.collection('rows').insertOne(newRow);
    res.json({
      row: newRow,
      nextId: newId + 1,
      nextOp: newOp + 1
    });
  } catch (e) {
    res.status(500).json({ error: 'Error al guardar la fila' });
  }
});

app.post('/api/planilla/fila/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const updated = req.body || {};
  delete updated._id;
  delete updated.id;
  delete updated.numeroOperacion;
  try {
    const mdb = db.getDb();
    const result = await mdb.collection('rows').findOneAndUpdate(
      { id },
      { $set: updated },
      { returnDocument: 'after' }
    );
    res.json({ row: result || null });
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar la fila' });
  }
});

app.post('/api/planilla/corte', async (req, res) => {
  const { orden, cantidad, fechaHora } = req.body || {};
  try {
    const mdb = db.getDb();
    const totalRows = await mdb.collection('rows').countDocuments();
    const totalCortes = await mdb.collection('cortes').countDocuments();
    const corte = {
      orden: orden ?? totalCortes + 1,
      cantidad: cantidad ?? totalRows,
      fechaHora: fechaHora || new Date().toISOString()
    };
    await mdb.collection('cortes').insertOne(corte);
    const cortes = await mdb.collection('cortes').find().toArray();
    res.json({ cortes });
  } catch (e) {
    res.status(500).json({ error: 'Error al guardar el corte' });
  }
});

app.delete('/api/planilla/corte/:orden', async (req, res) => {
  const orden = parseInt(req.params.orden, 10);
  if (isNaN(orden)) return res.status(400).json({ error: 'Orden de corte inválido' });
  try {
    const mdb = db.getDb();
    const result = await mdb.collection('cortes').deleteOne({ orden });
    const cortes = await mdb.collection('cortes').find().toArray();
    res.json({ cortes, removed: result.deletedCount > 0 });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar el corte' });
  }
});

app.put('/api/planilla/cortes', async (req, res) => {
  const { cortes: nuevosCortes } = req.body || {};
  if (!Array.isArray(nuevosCortes)) {
    return res.status(400).json({ error: 'Se requiere array cortes' });
  }
  try {
    const mdb = db.getDb();
    await mdb.collection('cortes').deleteMany({});
    if (nuevosCortes.length > 0) {
      await mdb.collection('cortes').insertMany(nuevosCortes);
    }
    const cortes = await mdb.collection('cortes').find().toArray();
    res.json({ cortes });
  } catch (e) {
    res.status(500).json({ error: 'Error al actualizar cortes' });
  }
});

app.delete('/api/planilla/fila/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    const mdb = db.getDb();
    await mdb.collection('rows').deleteOne({ id });
    const rows = await mdb.collection('rows').find().toArray();
    res.json({ rows });
  } catch (e) {
    res.status(500).json({ error: 'Error al eliminar la fila' });
  }
});

app.post('/api/planilla/finanzas/:id', async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const { finanzas } = req.body || {};
  try {
    const mdb = db.getDb();
    const result = await mdb.collection('rows').findOneAndUpdate(
      { id },
      { $set: { finanzas: typeof finanzas === 'string' ? finanzas : '' } },
      { returnDocument: 'after' }
    );
    if (!result) {
      const rows = await mdb.collection('rows').find().toArray();
      return res.json({ rows });
    }
    res.json({ row: result });
  } catch (e) {
    res.status(500).json({ error: 'Error al guardar Finanzas' });
  }
});

app.post('/api/planilla/limpiar', async (req, res) => {
  const { password } = req.body || {};
  if (password !== CORTE_PASSWORD) {
    return res.status(403).json({ error: 'Contraseña incorrecta' });
  }
  try {
    const mdb = db.getDb();
    const counterOp = await mdb.collection('counters').findOne({ _id: 'opNum' });
    const nextOp = counterOp?.seq || 1;
    await mdb.collection('rows').deleteMany({});
    await mdb.collection('cortes').deleteMany({});
    await mdb.collection('counters').updateOne({ _id: 'rowId' }, { $set: { seq: 1 } });
    res.json({ rows: [], cortes: [], nextId: 1, nextOp });
  } catch (e) {
    res.status(500).json({ error: 'Error al limpiar' });
  }
});

app.use(express.static(__dirname, {
  index: 'index.html',
  maxAge: IS_PROD ? '1d' : 0,
  etag: true
}));

db.connect()
  .then(() => {
    const HOST = process.env.HOST || '0.0.0.0';
    app.listen(PORT, HOST, () => {
      console.log('\n========================================');
      console.log('Pedidos de pagos PDA - Servidor iniciado');
      console.log('Base de datos: MongoDB Atlas');
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
              ips.forEach((ip) => console.log(`  http://${ip}:${PORT}`));
            }
          }
        } catch (e) { /* ignorar */ }
      }

      console.log('\n========================================');
      console.log('Si no puedes acceder desde la red, ejecuta:');
      console.log('  .\\configurar_firewall.ps1');
      console.log('(como Administrador)');
      console.log('========================================\n');
    });
  })
  .catch((err) => {
    console.error('Error al conectar a MongoDB:', err);
    process.exit(1);
  });
