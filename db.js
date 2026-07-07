const { MongoClient } = require('mongodb');

const MONGO_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/planilla-pda';
const DB_NAME = process.env.MONGODB_DB || 'planilla-pda';

let client = null;
let db = null;

async function connect() {
  if (db) return db;
  const newClient = new MongoClient(MONGO_URI);
  try {
    await newClient.connect();
    const newDb = newClient.db(DB_NAME);

    // Crear colecciones con índices
    const collections = await newDb.listCollections().toArray();
    const colNames = collections.map(c => c.name);

    if (!colNames.includes('rows')) {
      await newDb.createCollection('rows');
    }
    if (!colNames.includes('cortes')) {
      await newDb.createCollection('cortes');
    }
    if (!colNames.includes('counters')) {
      await newDb.createCollection('counters');
    }

    // Índices
    await newDb.collection('rows').createIndex({ id: 1 }, { unique: true });
    await newDb.collection('rows').createIndex({ empresa: 1 });
    await newDb.collection('rows').createIndex({ vencimiento: 1 });
    await newDb.collection('rows').createIndex({ aut_pda: 1 });
    await newDb.collection('rows').createIndex({ aut_finanzas: 1 });
    await newDb.collection('cortes').createIndex({ orden: 1 }, { unique: true });

    // Inicializar contadores si no existen
    const counters = newDb.collection('counters');
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

    client = newClient;
    db = newDb;
    console.log(`Conectado a MongoDB: ${DB_NAME}`);
    return db;
  } catch (err) {
    await newClient.close();
    throw err;
  }
}

function getDb() {
  if (!db) throw new Error('Base de datos no conectada. Ejecutá connect() primero.');
  return db;
}

async function incrementCounter(name) {
  const database = getDb();
  const result = await database.collection('counters').findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { returnDocument: 'after', upsert: true }
  );
  return result.seq;
}

async function getCounter(name) {
  const database = getDb();
  const doc = await database.collection('counters').findOne({ _id: name });
  return doc ? doc.seq : 1;
}

async function disconnect() {
  if (client) await client.close();
  client = null;
  db = null;
}

module.exports = { connect, getDb, incrementCounter, getCounter, disconnect };
