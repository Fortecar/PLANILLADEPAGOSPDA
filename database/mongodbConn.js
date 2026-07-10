const mongoose = require('mongoose');

const mongodbConn = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/planilla-pda';
    const dbName = process.env.MONGODB_DB || 'planilla-pda';

    await mongoose.connect(uri, { dbName });

    console.log(`Conectado a MongoDB: ${dbName}`);
  } catch (error) {
    console.error(error);
    throw new Error('Error initializing the database');
  }
};

module.exports = { mongodbConn };
