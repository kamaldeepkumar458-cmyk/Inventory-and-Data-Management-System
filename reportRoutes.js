const router = require('express').Router();
const { lowStockReport, categorySummary } = require('../controllers/reportController');

router.get('/low-stock', lowStockReport);
router.get('/category-summary', categorySummary);

module.exports = router;
