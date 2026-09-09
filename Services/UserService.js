const User = require('../Models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// ─── Email Setup (Nodemailer) ──────────────────────────────
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  // أجبِر Nodemailer على تجاهل مشاكل شهادة الأمان المحلية
  tls: {
    rejectUnauthorized: false
  }
});

const sendEmail = async (to, subject, html) => {
  try {
    await transporter.sendMail({
      from: `أرباح ERP <${process.env.EMAIL_USER || 'noreply@arbah.com'}>`,
      to,
      subject,
      html
    });
    console.log(`📧 Email sent to ${to}`);
  } catch (error) {
    console.error('❌ Email failed:', error.message);
    // Don't throw - let the user still register even if email fails
  }
};

const JWT_SECRET = process.env.JWT_SECRET || 'ArbahERP-Secret-Key-2026';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';
const SALT_ROUNDS = 12;

// ─── Helpers ───────────────────────────────────────────────

const generateToken = (payload) => {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
};

const generateOtp = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

const hashPassword = async (password) => {
  return await bcrypt.hash(password, SALT_ROUNDS);
};

const comparePassword = async (candidatePassword, hashedPassword) => {
  return await bcrypt.compare(candidatePassword, hashedPassword);
};

const createSendToken = (user, statusCode, res) => {
  const token = generateToken({
    id: user._id,
    email: user.email,
    role: user.role,
    company: user.company?.name
  });

  user.password = undefined;

  res.status(statusCode).json({
    status: 'success',
    token,
    data: {
      user: {
        id: user._id,
        fullName: user.fullName,
        username: user.username,
        email: user.email,
        phone: user.phone,
        role: user.role,
        company: user.company,
        isActive: user.isActive,
        isVerified: user.isVerified,
        createdAt: user.createdAt
      }
    }
  });
};

// ─── Service Functions ──────────────────────────────────────

/**
 * Register a new user
 */
exports.register = async (req, res) => {
  try {
    const {
      fullName, username, email, phone, password
    } = req.body;

    // Check if email exists
    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(400).json({
        status: 'fail',
        message: 'البريد الإلكتروني مستخدم بالفعل'
      });
    }

    // Check if username exists
    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return res.status(400).json({
        status: 'fail',
        message: 'اسم المستخدم مستخدم بالفعل'
      });
    }

    // Hash password
    const hashedPassword = await hashPassword(password);

    // Create user
    const newUser = await User.create({
      fullName,
      username,
      email,
      phone,
      password: hashedPassword,
      isVerified: false
    });

    // Generate OTP
    const otp = generateOtp();
    newUser.otpCode = await bcrypt.hash(otp, SALT_ROUNDS);
    newUser.otpExpires = Date.now() + 2 * 60 * 1000; // 2 minutes
    await newUser.save({ validateBeforeSave: false });

    // Send OTP via Email
    const emailHtml = `
      <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #f8fafc; border-radius: 16px; text-align: center;">
        <div style="background: #10b981; color: white; padding: 20px; border-radius: 12px 12px 0 0; margin: -30px -30px 20px -30px;">
          <h2 style="margin: 0;">🔐 رمز التحقق</h2>
        </div>
        <p style="color: #475569; font-size: 16px;">مرحباً <strong>${fullName}</strong>،</p>
        <p style="color: #64748b;">لإكمال تسجيل حسابك في نظام أرباح ERP، يرجى إدخال رمز التحقق التالي:</p>
        <div style="background: #fff; border: 2px dashed #10b981; padding: 20px; margin: 20px 0; border-radius: 12px;">
          <span style="font-size: 36px; font-weight: bold; color: #10b981; letter-spacing: 8px;">${otp}</span>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">⚠️ الرمز صالح لمدة <strong>دقيقتين</strong> فقط</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px;">إذا لم تطلب هذا الرمز، يرجى تجاهل هذه الرسالة.</p>
        <p style="color: #94a3b8; font-size: 12px;">فريق أرباح ERP</p>
      </div>
    `;

    await sendEmail(email, '🔐 رمز التحقق - أرباح ERP', emailHtml);

    // Also log for debugging
    console.log(`🔐 OTP for ${email}: ${otp}`);

    res.status(201).json({
      status: 'success',
      message: 'تم إرسال رمز التحقق إلى بريدك الإلكتروني',
      data: {
        userId: newUser._id,
        email: newUser.email
      }
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'حدث خطأ أثناء إنشاء الحساب'
    });
  }
};

/**
 * Verify OTP
 */
exports.verifyOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({ email }).select('+otpCode +otpExpires');
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    // Check if OTP expired
    if (user.otpExpires < Date.now()) {
      return res.status(400).json({
        status: 'fail',
        message: 'رمز التحقق منتهي الصلاحية'
      });
    }

    // Verify OTP
    const isOtpValid = await bcrypt.compare(otp, user.otpCode);
    if (!isOtpValid) {
      return res.status(400).json({
        status: 'fail',
        message: 'رمز التحقق غير صحيح'
      });
    }

    // Mark as verified
    user.isVerified = true;
    user.otpCode = undefined;
    user.otpExpires = undefined;
    await user.save({ validateBeforeSave: false });

    // Send welcome email
    const welcomeHtml = `
      <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #f8fafc; border-radius: 16px; text-align: center;">
        <div style="background: #10b981; color: white; padding: 20px; border-radius: 12px 12px 0 0; margin: -30px -30px 20px -30px;">
          <h2 style="margin: 0;">🎉 تم التحقق بنجاح!</h2>
        </div>
        <p style="color: #475569; font-size: 16px;">مرحباً <strong>${user.fullName}</strong>،</p>
        <p style="color: #64748b;">تم تفعيل حسابك بنجاح في نظام أرباح ERP.</p>
        <p style="color: #64748b;">يمكنك الآن تسجيل الدخول وبدء إدارة أعمالك.</p>
        <a href="http://localhost:3000/Login" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 8px; margin-top: 15px;">تسجيل الدخول</a>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px;">فريق أرباح ERP</p>
      </div>
    `;

    await sendEmail(user.email, '🎉 تم تفعيل حسابك - أرباح ERP', welcomeHtml);

    // Send token
    createSendToken(user, 200, res);

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'حدث خطأ أثناء التحقق'
    });
  }
};

/**
 * Resend OTP
 */
exports.resendOtp = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    if (user.isVerified) {
      return res.status(400).json({
        status: 'fail',
        message: 'الحساب مُفعَّل بالفعل'
      });
    }

    const otp = generateOtp();
    user.otpCode = await bcrypt.hash(otp, SALT_ROUNDS);
    user.otpExpires = Date.now() + 2 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Send new OTP email
    const emailHtml = `
      <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #f8fafc; border-radius: 16px; text-align: center;">
        <div style="background: #f59e0b; color: white; padding: 20px; border-radius: 12px 12px 0 0; margin: -30px -30px 20px -30px;">
          <h2 style="margin: 0;">🔄 رمز التحقق الجديد</h2>
        </div>
        <p style="color: #475569; font-size: 16px;">مرحباً <strong>${user.fullName}</strong>،</p>
        <p style="color: #64748b;">لقد طلبت إعادة إرسال رمز التحقق. الرمز الجديد:</p>
        <div style="background: #fff; border: 2px dashed #f59e0b; padding: 20px; margin: 20px 0; border-radius: 12px;">
          <span style="font-size: 36px; font-weight: bold; color: #f59e0b; letter-spacing: 8px;">${otp}</span>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">⚠️ الرمز صالح لمدة <strong>دقيقتين</strong> فقط</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px;">فريق أرباح ERP</p>
      </div>
    `;

    await sendEmail(email, '🔄 رمز التحقق الجديد - أرباح ERP', emailHtml);

    console.log(`🔐 New OTP for ${email}: ${otp}`);

    res.status(200).json({
      status: 'success',
      message: 'تم إعادة إرسال رمز التحقق إلى بريدك الإلكتروني'
    });

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'حدث خطأ أثناء إعادة الإرسال'
    });
  }
};

/**
 * Login user
 */
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'fail',
        message: 'يرجى إدخال البريد الإلكتروني وكلمة المرور'
      });
    }

    const user = await User.findOne({
      $or: [{ email }, { username: email }]
    }).select('+password');

    if (!user || !(await comparePassword(password, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'البريد الإلكتروني أو كلمة المرور غير صحيحة'
      });
    }

    if (!user.isActive) {
      return res.status(403).json({
        status: 'fail',
        message: 'الحساب معطل. يرجى التواصل مع الدعم'
      });
    }

    if (!user.isVerified) {
      return res.status(403).json({
        status: 'fail',
        message: 'الحساب غير مُفعَّل. يرجى التحقق من بريدك الإلكتروني',
        needsVerification: true,
        email: user.email
      });
    }

    user.lastLogin = Date.now();
    await user.save({ validateBeforeSave: false });

    createSendToken(user, 200, res);

  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message || 'حدث خطأ أثناء تسجيل الدخول'
    });
  }
};

/**
 * Get current user
 */
exports.getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }
    res.status(200).json({
      status: 'success',
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Update user profile
 */
exports.updateMe = async (req, res) => {
  try {
    if (req.body.password) {
      return res.status(400).json({
        status: 'fail',
        message: 'لا يمكن تحديث كلمة المرور من هنا. استخدم تغيير كلمة المرور'
      });
    }

    const allowedFields = ['fullName', 'phone', 'company'];
    const filteredBody = {};
    Object.keys(req.body).forEach(key => {
      if (allowedFields.includes(key)) filteredBody[key] = req.body[key];
    });

    const updatedUser = await User.findByIdAndUpdate(
      req.user.id,
      filteredBody,
      { new: true, runValidators: true }
    );

    res.status(200).json({
      status: 'success',
      data: { user: updatedUser }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Change password
 */
exports.changePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user.id).select('+password');

    if (!(await comparePassword(currentPassword, user.password))) {
      return res.status(401).json({
        status: 'fail',
        message: 'كلمة المرور الحالية غير صحيحة'
      });
    }

    user.password = await hashPassword(newPassword);
    user.passwordChangedAt = Date.now();
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Forgot password
 */
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    const user = await User.findOne({ email });

    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'لا يوجد مستخدم بهذا البريد الإلكتروني'
      });
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    user.passwordResetToken = crypto
      .createHash('sha256')
      .update(resetToken)
      .digest('hex');
    user.passwordResetExpires = Date.now() + 10 * 60 * 1000;
    await user.save({ validateBeforeSave: false });

    // Send reset email
    const resetHtml = `
      <div dir="rtl" style="font-family: 'Cairo', Arial, sans-serif; max-width: 500px; margin: 0 auto; padding: 30px; background: #f8fafc; border-radius: 16px; text-align: center;">
        <div style="background: #ef4444; color: white; padding: 20px; border-radius: 12px 12px 0 0; margin: -30px -30px 20px -30px;">
          <h2 style="margin: 0;">🔑 إعادة تعيين كلمة المرور</h2>
        </div>
        <p style="color: #475569; font-size: 16px;">مرحباً <strong>${user.fullName}</strong>،</p>
        <p style="color: #64748b;">لقد تلقينا طلباً لإعادة تعيين كلمة المرور الخاصة بك.</p>
        <p style="color: #64748b;">رمز إعادة التعيين:</p>
        <div style="background: #fff; border: 2px dashed #ef4444; padding: 20px; margin: 20px 0; border-radius: 12px;">
          <span style="font-size: 24px; font-weight: bold; color: #ef4444; letter-spacing: 4px;">${resetToken}</span>
        </div>
        <p style="color: #94a3b8; font-size: 14px;">⚠️ الرمز صالح لمدة <strong>10 دقائق</strong> فقط</p>
        <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
        <p style="color: #94a3b8; font-size: 12px;">إذا لم تطلب هذا، يرجى تجاهل الرسالة.</p>
      </div>
    `;

    await sendEmail(email, '🔑 إعادة تعيين كلمة المرور - أرباح ERP', resetHtml);

    res.status(200).json({
      status: 'success',
      message: 'تم إرسال رابط إعادة تعيين كلمة المرور إلى بريدك الإلكتروني'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Reset password
 */
exports.resetPassword = async (req, res) => {
  try {
    const { token, newPassword } = req.body;
    const hashedToken = crypto.createHash('sha256').update(token).digest('hex');

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: Date.now() }
    });

    if (!user) {
      return res.status(400).json({
        status: 'fail',
        message: 'الرمز غير صالح أو منتهي الصلاحية'
      });
    }

    user.password = await hashPassword(newPassword);
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now();
    await user.save();

    createSendToken(user, 200, res);
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Logout
 */
exports.logout = (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'تم تسجيل الخروج بنجاح'
  });
};

/**
 * Get all users (Admin only)
 */
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.status(200).json({
      status: 'success',
      results: users.length,
      data: { users }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};

/**
 * Toggle user active status (Admin only)
 */
exports.toggleUserStatus = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({
        status: 'fail',
        message: 'المستخدم غير موجود'
      });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.status(200).json({
      status: 'success',
      message: `تم ${user.isActive ? 'تفعيل' : 'تعطيل'} الحساب بنجاح`,
      data: { user }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
};