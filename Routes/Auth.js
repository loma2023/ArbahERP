const express = require('express');
const router = express.Router();
const authController = require('../Controllers/authController');
const { protect } = require('../Middleware/auth');

router.post('/Login', authController.login);
router.post('/Register', authController.register);
router.get('/Me', protect, authController.getMe);
router.post('/Logout', authController.logout);

module.exports = router;