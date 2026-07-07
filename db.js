const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/planilla-pda';
const DB_NAME = process.env.MONGODB_DB || 'planilla-pda';

let client = null;
let db = null;

async function connect() {
  if (db) return db;
  client = new MongoClient(MONGO_URI);
  await client.connect();
  db = client.db(DB_NAME);

  // Crear colecciones con índices
  const collections = await db.listCollections().toArray();
  const colNames = collections.map(c => c.name);

  if (!colNames.includes('rows')) {
    await db.createCollection('rows');
  }
  if (!colNames.includes('cortes')) {
    await db.createCollection('cortes');
  }
  if (!colNames.includes('counters')) {
    await db.createCollection('counters');
  }

  // Índices
  await db.collection('rows').createIndex({ id: 1 }, { unique: true });
  await db.collection('rows').createIndex({ empresa: 1 });
  await db.collection('rows').createIndex({ vencimiento: 1 });
  await db.collection('rows').createIndex({ aut_pda: 1 });
  await db.collection('rows').createIndex({ aut_finanzas: 1 });
  await db.collection('cortes').createIndex({ orden: 1 }, { unique: true });

  // Inicializar contadores si no existen
  const counters = db.collection('counters');
  await counters.updateOne(
    { _id: 'rowId' },
    { $setOnInsert: { seq: 1 } },
    { upsert: true }
  );
  await counters.updateOne(
    { _id: 'opNum' },
    { $setOnInsert: { seq: 1 } },
    { upsert: true }
  );

  console.log(`Conectado a MongoDB: ${DB_NAME}`);
  return db;
}

function getDb() {
  if (!db) throw new Error('Base de datos no conectada. Ejecutá connect() primero.');
  return db;
}

async function incrementCounter(name) {
  const result = await db.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return result.seq;
}

async function getCounter(name) {
  const doc = await db.collection('counters').findOne({ _id: name });
  return doc ? doc.seq : 1;
}

async function disconnect() {
  if (client) await client.close();
}

module.exports = { connect, getDb, incrementCounter, getCounter, disconnect };
