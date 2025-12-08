const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const backupController = require('../controllers/backupController');
const { asyncHandler } = require('../utils/errorHandler');

// Configure multer for file upload
// Get the actual execution directory (not the snapshot path for PKG)
const actualDir = process.pkg ? path.dirname(process.execPath) : __dirname;
const uploadDir = process.pkg 
  ? path.join(actualDir, 'uploads', 'backups') 
  : path.join(__dirname, '..', 'uploads', 'backups');

// Debug logging for path resolution
console.log('🔧 Backup path debug:', {
  isPkg: !!process.pkg,
  execPath: process.execPath,
  cwd: process.cwd(),
  actualDir: actualDir,
  uploadDir: uploadDir
});

// Ensure upload directory exists (only create in actual filesystem, not in PKG snapshot)
if (!fs.existsSync(uploadDir)) {
  try {
    fs.mkdirSync(uploadDir, { recursive: true });
  } catch (error) {
    console.warn('Warning: Could not create backup directory:', error.message);
  }
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadDir);
  },
  filename: function (req, file, cb) {
    // Use original filename with timestamp to prevent conflicts
    const timestamp = Date.now();
    const originalName = file.originalname.replace(/[^a-zA-Z0-9.-]/g, '_');
    cb(null, `${timestamp}-${originalName}`);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB max file size
  },
  fileFilter: function (req, file, cb) {
    // Accept only ZIP files
    if (file.mimetype === 'application/zip' || 
        file.mimetype === 'application/x-zip-compressed' ||
        file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('Only ZIP files are allowed'), false);
    }
  }
});

// ========================================
// API Routes
// ========================================

/**
 * GET /backup/download
 * Create and download backup ZIP file
 */
router.get('/download', backupController.createBackup);

/**
 * POST /backup/restore
 * Restore backup from uploaded ZIP file
 */
router.post('/restore', upload.single('backup'), backupController.restoreBackup);

/**
 * GET /backup/info
 * Get current backup information
 */
router.get('/info', backupController.getBackupInfo);

// ========================================
// EJS View Routes
// ========================================

/**
 * GET /backup/admin
 * Backup management admin page
 */
router.get('/admin', asyncHandler(async (req, res) => {
  res.render('backup-admin', {
    title: 'Data Backup & Restore',
    pageTitle: 'Data Backup & Restore'
  });
}));

module.exports = router;
