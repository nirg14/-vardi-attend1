const express = require('express');
const router = express.Router();
const { login } = require('../controllers/authController');

// התחברות למערכת
router.post('/login', login);

module.exports = router; 