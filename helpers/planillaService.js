const Counter = require('../models/Counter');

const incrementCounter = async (name) => {
  const result = await Counter.findOneAndUpdate(
    { _id: name },
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return result.seq;
};

const getCounter = async (name) => {
  const doc = await Counter.findOne({ _id: name });
  return doc ? doc.seq : 0;
};

module.exports = { incrementCounter, getCounter };
