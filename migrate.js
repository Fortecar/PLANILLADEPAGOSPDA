const fs = require('fs');
const path = require('path');
const { mongodbConn } = require('./database/mongodbConn');
const Row = require('./models/Row');
const Corte = require('./models/Corte');
const Counter = require('./models/Counter');

async function migrate() {
  const filePath = path.join(__dirname, 'data', 'planilla-pda.json');
  if (!fs.existsSync(filePath)) {
    console.error('No se encuentra data/planilla-pda.json');
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  console.log(`Archivo leído: ${data.rows.length} filas, ${data.cortes.length} cortes`);

  await mongodbConn();

  if (data.rows.length > 0) {
    await Row.insertMany(data.rows);
    console.log(`Insertadas ${data.rows.length} filas en MongoDB`);
  }

  if (data.cortes.length > 0) {
    await Corte.insertMany(data.cortes);
    console.log(`Insertados ${data.cortes.length} cortes en MongoDB`);
  }

  const maxId = data.rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
  const maxOp = data.rows.reduce((m, r) => Math.max(m, Number(r.numeroOperacion) || 0), 0);

  await Counter.updateOne(
    { _id: 'rowId' },
    { $set: { seq: Math.max(maxId, (Number(data.nextId) || 1) - 1) } },
    { upsert: true }
  );
  await Counter.updateOne(
    { _id: 'opNum' },
    { $set: { seq: Math.max(maxOp, (Number(data.nextOp) || 1) - 1) } },
    { upsert: true }
  );

  console.log('Contadores sincronizados');
  console.log('\nMigración completada exitosamente');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
