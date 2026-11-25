const router = require('express').Router();
const c = require('../controllers/productController');
const validateObjectId = require('../middleware/validateObjectId');
const { pickProductFields } = require('../middleware/validateBody');

router.route('/').get(c.getProducts).post(pickProductFields(), c.createProduct);

router.patch('/:id/stock', validateObjectId, c.adjustStock);

router
  .route('/:id')
  .all(validateObjectId)
  .get(c.getProduct)
  .put(pickProductFields(['name', 'sku', 'category', 'price', 'reorderLevel', 'supplier', 'description']), c.updateProduct)
  .delete(c.deleteProduct);

module.exports = router;
