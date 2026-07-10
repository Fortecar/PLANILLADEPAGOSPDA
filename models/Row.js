const { Schema, model } = require('mongoose');

const rowSchema = new Schema({
  id:               { type: Number },
  numeroOperacion:  { type: Number },
  fechaHora:        { type: String },
  solicitante:      { type: String },
  empresa:          { type: String, enum: ['Forte Car', 'Granville', 'Pampawagen'] },
  ce:               { type: String, default: '-' },
  grupo:            { type: String },
  orden:            { type: String },
  prevision:        { type: String, enum: ['SI', 'NO'], default: 'NO' },
  montoPrev:        { type: String, default: '-' },
  monto:            { type: String },
  fechaEdicionMonto:{ type: String, default: '-' },
  fechaEdicionCtaPersonal: { type: String, default: '-' },
  fechaEdicionCuentaMayor:{ type: String, default: '-' },
  cta_personal:     { type: String },
  titular:          { type: String },
  concepto:         { type: String },
  descripcion:      { type: String },
  cuotas:           { type: String, default: '-' },
  respaldo:         { type: String, default: '-' },
  saldo:            { type: String, default: '-' },
  cuenta_mayor:     { type: String },
  obsSolicitante:   { type: String, default: '-' },
  adjuntoNombre:    { type: String, default: '-' },
  adjuntoUrl:       { type: String, default: null },
  cupon:            { type: String, default: '' },
  fechaEdicionAdjunto:{ type: String, default: '-' },
  comprobanteNombre:{ type: String, default: '-' },
  comprobanteUrl:   { type: String, default: null },
  fechaEdicionComprobante:{ type: String, default: '-' },
  vencimiento:      { type: String },
  cumple72hs:       { type: Boolean, default: null },
  fechaHoraAutPda:  { type: String, default: '-' },
  cumple72hsPda:    { type: Boolean, default: null },
  aut_finanzas:     { type: String, default: '-' },
  comp_saldo:       { type: String, default: '-' },
  fecha_solic:      { type: String, default: '' },
  conf_pago:        { type: String, default: '' },
  ref_asiento:      { type: String, default: '' },
  obsFinanzas:      { type: String, default: '' },
  aut_pda:          { type: String, default: '-' },
  finanzas:         { type: String, default: '' },
}, { timestamps: true });

rowSchema.index({ id: 1 }, { unique: true });
rowSchema.index({ empresa: 1 });
rowSchema.index({ vencimiento: 1 });
rowSchema.index({ aut_pda: 1 });
rowSchema.index({ aut_finanzas: 1 });

module.exports = model('Row', rowSchema);
