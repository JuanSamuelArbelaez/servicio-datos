const express = require('express');
const OtpController = require('../controllers/otpController');

const router = express.Router();
const otpController = new OtpController();

// Middleware para parsear JSON
router.use(express.json());

/**
 * @route   POST /api/auth/otp
 * @desc    Crear un nuevo OTP para un usuario
 * @access  Public
 */
router.post('/otp', otpController.createOtp.bind(otpController));

module.exports = router;