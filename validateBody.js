const AppError = require('../utils/AppError');

const DETAIL_FIELDS = ['name', 'sku', 'category', 'price', 'quantity', 'reorderLevel', 'supplier', 'description'];

// Only allow known fields through; reject empty bodies.
const pickProductFields = (allowed = DETAIL_FIELDS) => (req, res, next) => {
  if (!req.body || Object.keys(req.body).length === 0) {
    return next(new AppError('Request body cannot be empty', 400));
  }
  const clean = {};
  allowed.forEach((f) => {
    if (req.body[f] !== undefined) clean[f] = req.body[f];
  });
  if (Object.keys(clean).length === 0) {
    return next(new AppError(`Body must include at least one of: ${allowed.join(', ')}`, 400));
  }
  req.body = clean;
  next();
};

module.exports = { pickProductFields, DETAIL_FIELDS };
