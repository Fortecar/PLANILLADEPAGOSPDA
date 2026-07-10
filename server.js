const express = require('express');
const compression = require('compression');
const cors = require('cors');
const { mongodbConn } = require('./database/mongodbConn');

const app = express();
const IS_PROD = process.env.NODE_ENV === 'production';
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || '0.0.0.0';

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

app.use('/api', require('./routes/planilla'));

app.use(express.static(__dirname, {
  index: 'index.html',
  maxAge: IS_PROD ? '1d' : 0,
  etag: true,
}));

async function start() {
  await mongodbConn();
  app.listen(PORT, HOST, () => {
    console.log('\n========================================');
    console.log('Pedidos de pagos PDA - Servidor iniciado');
    console.log('Base de datos: MongoDB (Mongoose)');
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
}

start().catch((err) => {
  console.error('Error al iniciar:', err);
  process.exit(1);
});
