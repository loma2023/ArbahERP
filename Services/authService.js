const jwt = require('jsonwebtoken');
const User = require('../Models/User');

const createToken = (userId) => {
  return jwt.sign(
    { userId },
    process.env.JWT_SECRET,
    { expiresIn: '8h' }
  );
};

exports.login = async (username, password) => {
  if (!username || !password) {
    throw new Error('يرجى إدخال اسم المستخدم وكلمة المرور');
  }

  const user = await User.findOne({ username }).select('+password');

  if (!user || !user.isActive) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  const isMatch = await user.comparePassword(password);
  if (!isMatch) {
    throw new Error('اسم المستخدم أو كلمة المرور غير صحيحة');
  }

  user.lastLogin = new Date();
  await user.save({ validateBeforeSave: false });

  const token = createToken(user._id);

  return {
    token,
    user: {
      id: user._id,
      username: user.username,
      name: user.name,
      role: user.role
    }
  };
};

exports.register = async (userData) => {
  const { username, password, name, role } = userData;

  const existing = await User.findOne({ username });
  if (existing) {
    throw new Error('اسم المستخدم مستخدم بالفعل');
  }

  const user = await User.create({ username, password, name, role });
  return {
    id: user._id,
    username: user.username,
    name: user.name,
    role: user.role
  };
};

exports.getMe = async (userId) => {
  const user = await User.findById(userId).select('-password');
  if (!user) throw new Error('المستخدم غير موجود');
  return user;
};