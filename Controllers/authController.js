const authService = require('../Services/authService');

exports.login = async (req, res) => {
  try {
    const { username, password } = req.body;
    const result = await authService.login(username, password);

    // تخزين الـ JWT في Cookie لزيادة الأمان
    res.cookie('jwt', result.token, {
      expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 أيام
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      path: '/'
    });

    res.status(200).json({
      success: true,
      message: 'تم تسجيل الدخول بنجاح',
      token: result.token,
      user: result.user
    });
  } catch (err) {
    res.status(401).json({ success: false, message: err.message });
  }
};

exports.register = async (req, res) => {
  try {
    const result = await authService.register(req.body);
    res.status(201).json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const user = await authService.getMe(req.user.userId || req.user._id);
    res.status(200).json({ success: true, data: user });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

exports.logout = (req, res) => {
  // مسح الكوكي تماماً وتغيير قيمتها
  res.cookie('jwt', 'loggedout', {
    expires: new Date(0),
    httpOnly: true,
    path: '/'
  });
  
  res.status(200).json({ 
    success: true, 
    message: 'تم تسجيل الخروج بنجاح' 
  });
};