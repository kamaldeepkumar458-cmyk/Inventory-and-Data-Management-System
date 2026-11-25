const mongoose = require('mongoose');

const intValidator = {
  validator: Number.isInteger,
  message: '{PATH} must be a whole number',
};

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
      minlength: [2, 'Name must be at least 2 characters'],
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },
    sku: {
      type: String,
      required: [true, 'SKU is required'],
      unique: true,
      trim: true,
      uppercase: true,
      match: [/^[A-Z0-9-]{3,20}$/, 'SKU must be 3-20 characters: letters, digits or hyphens'],
    },
    category: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      lowercase: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [0, 'Quantity cannot be negative'],
      validate: intValidator,
      default: 0,
    },
    reorderLevel: {
      type: Number,
      min: [0, 'Reorder level cannot be negative'],
      validate: intValidator,
      default: 10,
    },
    supplier: { type: String, trim: true, maxlength: 100 },
    description: { type: String, trim: true, maxlength: [500, 'Description cannot exceed 500 characters'] },
  },
  { timestamps: true, toJSON: { virtuals: true }, id: false }
);

productSchema.virtual('isLowStock').get(function () {
  return this.quantity <= this.reorderLevel;
});

productSchema.index({ category: 1, price: 1 });

module.exports = mongoose.model('Product', productSchema);
