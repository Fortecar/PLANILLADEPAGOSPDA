const Row = require('../models/Row');
const Corte = require('../models/Corte');
const { incrementCounter } = require('../helpers/planillaService');

const getPlanilla = async (req, res) => {
  try {
    const [rows, cortes, counterRow] = await Promise.all([
      Row.find().sort({ id: 1 }).lean(),
      Corte.find().sort({ orden: 1 }).lean(),
      require('../models/Counter').findOne({ _id: 'rowId' }).lean(),
    ]);
    const counterOp = await require('../models/Counter').findOne({ _id: 'opNum' }).lean();

    res.json({
      rows,
      cortes,
      nextId: (counterRow?.seq || 0) + 1,
      nextOp: (counterOp?.seq || 0) + 1,
    });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Error al leer la planilla' });
  }
};

const createFila = async (req, res) => {
  const row = req.body;
  if (!row || typeof row !== 'object') {
    return res.status(400).json({ error: 'Cuerpo inválido' });
  }
  if (req.files) {
    if (req.files['adjunto']) {
      row.adjuntoUrl = req.files['adjunto'][0].location;
      row.adjuntoNombre = req.files['adjunto'][0].originalname;
    }
    if (req.files['comprobante']) {
      row.comprobanteUrl = req.files['comprobante'][0].location;
      row.comprobanteNombre = req.files['comprobante'][0].originalname;
    }
  }
  try {
    const newId = await incrementCounter('rowId');
    const newOp = await incrementCounter('opNum');
    const newRow = await Row.create({
      ...row,
      id: newId,
      numeroOperacion: newOp,
    });
    res.json({
      row: newRow.toObject(),
      nextId: newId + 1,
      nextOp: newOp + 1,
    });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Error al guardar la fila' });
  }
};

const updateFila = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const updated = req.body || {};
  delete updated._id;
  delete updated.id;
  delete updated.numeroOperacion;
  if (req.files) {
    if (req.files['adjunto']) {
      updated.adjuntoUrl = req.files['adjunto'][0].location;
      updated.adjuntoNombre = req.files['adjunto'][0].originalname;
    }
    if (req.files['comprobante']) {
      updated.comprobanteUrl = req.files['comprobante'][0].location;
      updated.comprobanteNombre = req.files['comprobante'][0].originalname;
    }
  }
  try {
    const result = await Row.findOneAndUpdate(
      { id },
      { $set: updated },
      { new: true, lean: true }
    );
    res.json({ row: result || null });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Error al actualizar la fila' });
  }
};

const deleteFila = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  try {
    await Row.deleteOne({ id });
    const rows = await Row.find().sort({ id: 1 }).lean();
    res.json({ rows });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Error al eliminar la fila' });
  }
};

const createCorte = async (req, res) => {
  const { orden, cantidad, fechaHora } = req.body || {};
  try {
    const totalCortes = await Corte.countDocuments();
    const corte = await Corte.create({
      orden: orden ?? totalCortes + 1,
      cantidad: cantidad ?? (await Row.countDocuments()),
      fechaHora: fechaHora || new Date().toISOString(),
    });
    const cortes = await Corte.find().sort({ orden: 1 }).lean();
    res.json({ cortes });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Error al guardar el corte' });
  }
};

const deleteCorte = async (req, res) => {
  const orden = parseInt(req.params.orden, 10);
  if (isNaN(orden)) return res.status(400).json({ error: 'Orden de corte inválido' });
  try {
    const result = await Corte.deleteOne({ orden });
    const cortes = await Corte.find().sort({ orden: 1 }).lean();
    res.json({ cortes, removed: result.deletedCount > 0 });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Error al eliminar el corte' });
  }
};

const updateCortes = async (req, res) => {
  const { cortes: nuevosCortes } = req.body || {};
  if (!Array.isArray(nuevosCortes)) {
    return res.status(400).json({ error: 'Se requiere array cortes' });
  }
  try {
    await Corte.deleteMany({});
    if (nuevosCortes.length > 0) {
      await Corte.insertMany(nuevosCortes);
    }
    const cortes = await Corte.find().sort({ orden: 1 }).lean();
    res.json({ cortes });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Error al actualizar cortes' });
  }
};

const updateFinanzas = async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) return res.status(400).json({ error: 'ID inválido' });
  const { finanzas } = req.body || {};
  try {
    const result = await Row.findOneAndUpdate(
      { id },
      { $set: { finanzas: typeof finanzas === 'string' ? finanzas : '' } },
      { new: true, lean: true }
    );
    if (!result) {
      const rows = await Row.find().sort({ id: 1 }).lean();
      return res.json({ rows });
    }
    res.json({ row: result });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Error al guardar Finanzas' });
  }
};

const limpiarPlanilla = async (req, res) => {
  const CORTE_PASSWORD = process.env.CORTE_PASSWORD || 'Finanzas$2026';
  const { password } = req.body || {};
  if (password !== CORTE_PASSWORD) {
    return res.status(403).json({ error: 'Contraseña incorrecta' });
  }
  try {
    const counterOp = await require('../models/Counter').findOne({ _id: 'opNum' }).lean();
    const nextOp = counterOp?.seq || 1;
    await Row.deleteMany({});
    await Corte.deleteMany({});
    await require('../models/Counter').updateOne({ _id: 'rowId' }, { $set: { seq: 0 } });
    res.json({ rows: [], cortes: [], nextId: 1, nextOp });
  } catch (e) {
    console.error(e.message);
    res.status(500).json({ error: 'Error al limpiar' });
  }
};

module.exports = {
  getPlanilla, createFila, updateFila, deleteFila,
  createCorte, deleteCorte, updateCortes,
  updateFinanzas, limpiarPlanilla,
};
