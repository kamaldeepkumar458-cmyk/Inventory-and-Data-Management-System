const Product = require('../models/Product');
const asyncHandler = require('../utils/asyncHandler');

// GET /api/reports/low-stock  -> products where quantity <= reorderLevel
exports.lowStockReport = asyncHandler(async (req, res) => {
  const data = await Product.aggregate([
    { $match: { $expr: { $lte: ['$quantity', '$reorderLevel'] } } },
    {
      $project: {
        name: 1, sku: 1, category: 1, quantity: 1, reorderLevel: 1,
        shortfall: { $subtract: ['$reorderLevel', '$quantity'] },
        status: { $cond: [{ $eq: ['$quantity', 0] }, 'OUT_OF_STOCK', 'LOW_STOCK'] },
      },
    },
    { $sort: { quantity: 1, name: 1 } },
  ]);
  res.json({ success: true, count: data.length, data });
});

// GET /api/reports/category-summary
exports.categorySummary = asyncHandler(async (req, res) => {
  const data = await Product.aggregate([
    {
      $group: {
        _id: '$category',
        totalProducts: { $sum: 1 },
        totalQuantity: { $sum: '$quantity' },
        totalValue: { $sum: { $multiply: ['$price', '$quantity'] } },
        averagePrice: { $avg: '$price' },
        lowStockCount: { $sum: { $cond: [{ $lte: ['$quantity', '$reorderLevel'] }, 1, 0] } },
      },
    },
    {
      $project: {
        _id: 0,
        category: '$_id',
        totalProducts: 1,
        totalQuantity: 1,
        totalValue: { $round: ['$totalValue', 2] },
        averagePrice: { $round: ['$averagePrice', 2] },
        lowStockCount: 1,
      },
    },
    { $sort: { totalValue: -1 } },
  ]);
  res.json({ success: true, count: data.length, data });
});
