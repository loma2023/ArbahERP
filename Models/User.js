const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: {
    type: String,
    required: [true, 'الاسم الكامل مطلوب'],
    trim: true,
    minlength: [2, 'الاسم يجب أن يكون حرفين على الأقل']
  },
  username: {
    type: String,
    required: [true, 'اسم المستخدم مطلوب'],
    unique: true,
    trim: true,
    minlength: [3, 'اسم المستخدم يجب أن يكون 3 أحرف على الأقل'],
    match: [/^[a-zA-Z0-9_]+$/, 'اسم المستخدم يجب أن يحتوي على أحرف إنجليزية وأرقام فقط']
  },
  email: {
    type: String,
    required: [true, 'البريد الإلكتروني مطلوب'],
    unique: true,
    lowercase: true,
    trim: true,
    match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'بريد إلكتروني غير صحيح']
  },
  phone: {
    type: String,
    required: [true, 'رقم الهاتف مطلوب'],
    match: [/^05\d{8}$/, 'رقم الهاتف يجب أن يبدأ بـ 05 ويتكون من 10 أرقام']
  },
  password: {
    type: String,
    required: [true, 'كلمة المرور مطلوبة'],
    minlength: [8, 'كلمة المرور يجب أن تكون 8 أحرف على الأقل'],
    select: false
  },
  role: {
    type: String,
    enum: ['admin', 'manager', 'accountant', 'user'],
    default: 'admin'
  },
  company: {
    name: { type: String, default: '' },  // ← NOT required anymore
    type: { type: String, enum: ['retail', 'wholesale', 'manufacturing', 'services', 'restaurant', 'healthcare', 'construction', 'other'], default: 'retail' },
    taxNumber: { type: String, default: '' },
    commercialReg: { type: String, default: '' },
    phone: { type: String, default: '' },
    city: { type: String, default: '' },
    address: { type: String, default: '' }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  isVerified: {
    type: Boolean,
    default: false
  },
  lastLogin: {
    type: Date
  },
  otpCode: {
    type: String,
    select: false
  },
  otpExpires: {
    type: Date,
    select: false
  },
  passwordChangedAt: {
    type: Date
  },
  passwordResetToken: {
    type: String,
    select: false
  },
  passwordResetExpires: {
    type: Date,
    select: false
  }
}, {
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// Index for performance
userSchema.index({ 'company.name': 1 });

// Virtual for display name
userSchema.virtual('displayName').get(function() {
  return this.fullName || this.username;
});

module.exports = mongoose.model('User', userSchema);