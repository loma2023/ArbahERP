const express = require('express');
const router = express.Router();
const userController = require('../Controllers/UserController');
const authMiddleware = require('../Middleware/AuthMiddleware');

// ─── Public Routes ─────────────────────────────────────────

// Register new user
router.post('/Register', userController.register);

// Verify OTP
router.post('/Verify-Otp', userController.verifyOtp);

// Resend OTP
router.post('/Resend-Otp', userController.resendOtp);

// Login
router.post('/Login', userController.login);

// Forgot password
router.post('/Forgot-Password', userController.forgotPassword);

// Reset password
router.post('/Reset-Password', userController.resetPassword);

// ─── Protected Routes (require login) ──────────────────────

// Get current user profile
router.get('/Me', authMiddleware.protect, userController.getMe);

// Update current user profile
router.patch('/Update-Me', authMiddleware.protect, userController.updateMe);

// Change password
router.patch('/Change-Password', authMiddleware.protect, userController.changePassword);

// Logout
router.get('/Logout', authMiddleware.protect, userController.logout);

// ─── Admin Only Routes ─────────────────────────────────────

// Get all users
router.get('/All', authMiddleware.protect, authMiddleware.restrictTo('admin'), userController.getAllUsers);

// Toggle user status (activate/deactivate)
router.patch('/Toggle-Status/:id', authMiddleware.protect, authMiddleware.restrictTo('admin'), userController.toggleUserStatus);

module.exports = router;
