const userService = require('../Services/UserService');

// ─── Auth Controllers ──────────────────────────────────────

exports.register = userService.register;
exports.verifyOtp = userService.verifyOtp;
exports.resendOtp = userService.resendOtp;
exports.login = userService.login;
exports.logout = userService.logout;
exports.forgotPassword = userService.forgotPassword;
exports.resetPassword = userService.resetPassword;

// ─── User Profile Controllers ───────────────────────────────

exports.getMe = userService.getMe;
exports.updateMe = userService.updateMe;
exports.changePassword = userService.changePassword;

// ─── Admin Controllers ────────────────────────────────────

exports.getAllUsers = userService.getAllUsers;
exports.toggleUserStatus = userService.toggleUserStatus;
