const router = require('express').Router();
const { uploadFields } = require('../middlewares/multer');
const {
  getPlanilla, createFila, updateFila, deleteFila,
  createCorte, deleteCorte, updateCortes,
  updateFinanzas, limpiarPlanilla,
} = require('../controllers/planilla');

router.get('/planilla', getPlanilla);
router.post('/planilla/fila', uploadFields, createFila);
router.post('/planilla/fila/:id', uploadFields, updateFila);
router.delete('/planilla/fila/:id', deleteFila);
router.post('/planilla/corte', createCorte);
router.delete('/planilla/corte/:orden', deleteCorte);
router.put('/planilla/cortes', updateCortes);
router.post('/planilla/finanzas/:id', updateFinanzas);
router.post('/planilla/limpiar', limpiarPlanilla);

module.exports = router;
