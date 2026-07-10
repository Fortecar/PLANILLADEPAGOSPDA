const { Schema, model } = require('mongoose');

const counterSchema = new Schema({
  _id:  { type: String },
  seq:  { type: Number, default: 0 },
}, { timestamps: true });

module.exports = model('Counter', counterSchema);
