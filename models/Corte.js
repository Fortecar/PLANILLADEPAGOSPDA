const { Schema, model } = require('mongoose');

const corteSchema = new Schema({
  orden:     { type: Number },
  cantidad:  { type: Number },
  fechaHora: { type: String },
}, { timestamps: true });

corteSchema.index({ orden: 1 }, { unique: true });

module.exports = model('Corte', corteSchema);
