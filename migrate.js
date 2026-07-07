const fs = require('fs');
const path = require('path');
const { connect, getDb, getCounter } = require('./db');

async function migrate() {
  const filePath = path.join(__dirname, 'data', 'planilla-pda.json');
  if (!fs.existsSync(filePath)) {
    console.error('No se encuentra data/planilla-pda.json');
    process.exit(1);
  }

  const raw = fs.readFileSync(filePath, 'utf8');
  const data = JSON.parse(raw);

  console.log(`Archivo leído: ${data.rows.length} filas, ${data.cortes.length} cortes`);

  await connect();
  const mdb = getDb();

  if (data.rows.length > 0) {
    const rowsWithId = data.rows.map(r => ({ ...r }));
    await mdb.collection('rows').insertMany(rowsWithId);
    console.log(`Insertadas ${rowsWithId.length} filas en MongoDB`);
  }

  if (data.cortes.length > 0) {
    await mdb.collection('cortes').insertMany(data.cortes);
    console.log(`Insertados ${data.cortes.length} cortes en MongoDB`);
  }

  const maxId = data.rows.reduce((m, r) => Math.max(m, Number(r.id) || 0), 0);
  const maxOp = data.rows.reduce((m, r) => Math.max(m, Number(r.numeroOperacion) || 0), 0);

  await mdb.collection('counters').updateOne(
    { _id: 'rowId' },
    { $set: { seq: Math.max(maxId + 1, Number(data.nextId) || 1) } }
  );
  await mdb.collection('counters').updateOne(
    { _id: 'opNum' },
    { $set: { seq: Math.max(maxOp + 1, Number(data.nextOp) || 1) } }
  );

  console.log('Contadores sincronizados');
  console.log('\nMigración completada exitosamente');
  process.exit(0);
}

migrate().catch((err) => {
  console.error('Error en migración:', err);
  process.exit(1);
});
