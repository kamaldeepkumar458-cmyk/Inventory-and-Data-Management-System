const Product = require('../models/Product');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

const SORTABLE = ['name', 'price', 'quantity', 'category', 'createdAt', 'updatedAt'];
const escapeRegex = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

// POST /api/products
exports.createProduct = asyncHandler(async (req, res) => {
  const product = await Product.create(req.body);
  res.status(201).json({ success: true, data: product });
});

// GET /api/products?category=&search=&minPrice=&maxPrice=&inStock=&sort=-price,name&page=1&limit=10
exports.getProducts = asyncHandler(async (req, res) => {
  const { category, search, minPrice, maxPrice, inStock, sort, page, limit } = req.query;
  const filter = {};

  if (category) filter.category = String(category).trim().toLowerCase();
  if (search) {
    const rx = new RegExp(escapeRegex(String(search)), 'i');
    filter.$or = [{ name: rx }, { sku: rx }];
  }
  if (minPrice !== undefined || maxPrice !== undefined) {
    filter.price = {};
    if (minPrice !== undefined) {
      if (isNaN(minPrice)) throw new AppError('minPrice must be a number', 400);
      filter.price.$gte = Number(minPrice);
    }
    if (maxPrice !== undefined) {
      if (isNaN(maxPrice)) throw new AppError('maxPrice must be a number', 400);
      filter.price.$lte = Number(maxPrice);
    }
  }
  if (inStock === 'true') filter.quantity = { $gt: 0 };
  if (inStock === 'false') filter.quantity = 0;

  // Sorting: comma-separated, "-" prefix = descending. Whitelisted fields only.
  let sortBy = '-createdAt';
  if (sort) {
    const fields = String(sort).split(',').map((f) => f.trim()).filter(Boolean);
    const invalid = fields.filter((f) => !SORTABLE.includes(f.replace(/^-/, '')));
    if (invalid.length) throw new AppError(`Cannot sort by: ${invalid.join(', ')}. Allowed: ${SORTABLE.join(', ')}`, 400);
    sortBy = fields.join(' ');
  }

  // Pagination
  const pageNum = Math.max(parseInt(page, 10) || 1, 1);
  const limitNum = Math.min(Math.max(parseInt(limit, 10) || 10, 1), 100);

  const [total, products] = await Promise.all([
    Product.countDocuments(filter),
    Product.find(filter).sort(sortBy).skip((pageNum - 1) * limitNum).limit(limitNum),
  ]);

  res.json({
    success: true,
    count: products.length,
    pagination: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    data: products,
  });
});

// GET /api/products/:id
exports.getProduct = asyncHandler(async (req, res) => {
  const product = await Product.findById(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.json({ success: true, data: product });
});

// PUT /api/products/:id  (details; stock is changed via PATCH /:id/stock)
exports.updateProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });
  if (!product) throw new AppError('Product not found', 404);
  res.json({ success: true, data: product });
});

// PATCH /api/products/:id/stock   body: { "type": "restock" | "sale", "quantity": 5 }
// Atomic $inc prevents race conditions; sales are guarded by a $gte condition so stock never goes negative.
exports.adjustStock = asyncHandler(async (req, res) => {
  const { type, quantity } = req.body || {};
  const qty = Number(quantity);

  if (!['restock', 'sale'].includes(type)) throw new AppError('type must be "restock" or "sale"', 400);
  if (!Number.isInteger(qty) || qty <= 0) throw new AppError('quantity must be a positive whole number', 400);

  let product;
  if (type === 'restock') {
    product = await Product.findByIdAndUpdate(req.params.id, { $inc: { quantity: qty } }, { new: true });
  } else {
    product = await Product.findOneAndUpdate(
      { _id: req.params.id, quantity: { $gte: qty } },
      { $inc: { quantity: -qty } },
      { new: true }
    );
    if (!product) {
      const existing = await Product.findById(req.params.id);
      if (!existing) throw new AppError('Product not found', 404);
      throw new AppError(`Insufficient stock: requested ${qty}, available ${existing.quantity}`, 400);
    }
  }
  if (!product) throw new AppError('Product not found', 404);

  res.json({ success: true, message: `Stock ${type} successful`, data: product });
});

// DELETE /api/products/:id
exports.deleteProduct = asyncHandler(async (req, res) => {
  const product = await Product.findByIdAndDelete(req.params.id);
  if (!product) throw new AppError('Product not found', 404);
  res.json({ success: true, message: 'Product deleted', data: product });
});
