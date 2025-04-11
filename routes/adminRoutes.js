const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
    uploadCsv,
    updateSystemPasswords,
    getUploadHistory
} = require('../controllers/adminController');

// כל הנתיבים דורשים הרשאות אדמין
router.use(protect, adminOnly);

// העלאת קובץ CSV
router.post('/upload-csv', uploadCsv);

// עדכון סיסמאות
router.post('/update-passwords', updateSystemPasswords);

// קבלת היסטוריית העלאות
router.get('/upload-history', getUploadHistory);

module.exports = router; 