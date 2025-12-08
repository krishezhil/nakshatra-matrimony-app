const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const dataFile = path.join(__dirname, '../data/users.json');

// Helper to read users
function readUsers() {
  if (!fs.existsSync(dataFile)) return [];
  return JSON.parse(fs.readFileSync(dataFile));
}

// Helper to write users
function writeUsers(users) {
  fs.writeFileSync(dataFile, JSON.stringify(users, null, 2));
}

// List users
router.get('/', (req, res) => {
  const users = readUsers();
  res.render('users', { users });
});

// Add user (simple form)
router.get('/add', (req, res) => {
  res.render('addUser');
});

// Handle add user
router.post('/add', (req, res) => {
  const users = readUsers();
  users.push(req.body);
  writeUsers(users);
  res.redirect('/users');
});

module.exports = router;
