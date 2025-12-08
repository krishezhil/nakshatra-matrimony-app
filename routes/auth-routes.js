// AuthController: Handles login, logout, and registration
const express = require('express');
const router = express.Router();


const authController = require('../controllers/authController');
// API endpoints
router.post('/api/login', authController.login);
router.post('/api/register', authController.register);
router.post('/api/auth/logout', authController.logout);

// View endpoints
router.get('/login', (req, res) => res.render('login'));
router.get('/register', (req, res) => res.render('register'));

module.exports = router;
