const jwt = require('jsonwebtoken');
const User = require('../Models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'ArbahERP-Secret-Key-2026';

/**
 * Protect routes - verify JWT token
 */
exports.protect = async (req, res, next) => {
  try {
    let token;

    // 1) Get token from header
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }
    // 2) Or get from cookie
    else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    // 3) Check if token exists
    if (!token) {
      return res.status(401).json({
        status: 'fail',
        message: 'غير مصرح. يرجى تسجيل الدخول أولاً'
      });
    }

    // 4) Verify token
    const decoded = jwt.verify(token, JWT_SECRET);

    // 5) Check if user still exists
    const currentUser = await User.findById(decoded.id);
    if (!currentUser) {
      return res.status(401).json({
        status: 'fail',
        message: 'المستخدم غير موجود. يرجى تسجيل الدخول مرة أخرى'
      });
    }

    // 6) Check if user changed password after token was issued
    if (currentUser.passwordChangedAt) {
      const changedTimestamp = parseInt(
        currentUser.passwordChangedAt.getTime() / 1000,
        10
      );
      if (decoded.iat < changedTimestamp) {
        return res.status(401).json({
          status: 'fail',
          message: 'تم تغيير كلمة المرور مؤخراً. يرجى تسجيل الدخول مرة أخرى'
        });
      }
    }

    // 7) Check if user is active
    if (!currentUser.isActive) {
      return res.status(403).json({
        status: 'fail',
        message: 'الحساب معطل. يرجى التواصل مع الدعم'
      });
    }

    // 8) Grant access
    req.user = currentUser;
    next();

  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        status: 'fail',
        message: 'رمز غير صالح. يرجى تسجيل الدخول مرة أخرى'
      });
    }
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        status: 'fail',
        message: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مرة أخرى'
      });
    }

    return res.status(500).json({
      status: 'error',
      message: error.message || 'حدث خطأ في المصادقة'
    });
  }
};

/**
 * Restrict to specific roles
 */
exports.restrictTo = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'fail',
        message: 'ليس لديك صلاحية للوصول إلى هذا المورد'
      });
    }
    next();
  };
};

/**
 * Check if user is logged in (for frontend rendering)
 */
exports.isLoggedIn = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.jwt) {
      token = req.cookies.jwt;
    }

    if (!token) {
      req.user = null;
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const currentUser = await User.findById(decoded.id);

    if (!currentUser || !currentUser.isActive) {
      req.user = null;
      return next();
    }

    req.user = currentUser;
    next();

  } catch (error) {
    req.user = null;
    next();
  }
};

/**
 * Optional auth - attach user if token exists, don't block if not
 */
exports.optionalAuth = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith('Bearer')
    ) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      return next();
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (user && user.isActive) {
      req.user = user;
    }

    next();

  } catch (error) {
    next();
  }
};
