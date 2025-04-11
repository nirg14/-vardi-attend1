const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
    saveAttendance,
    getAttendanceByLesson,
    getAttendanceByStudent,
    getComparisonReport
} = require('../controllers/attendanceController');

// שמירת נוכחות
router.post('/', protect, saveAttendance);

// קבלת נוכחות לפי שיעור
router.get('/lesson', protect, getAttendanceByLesson);

// קבלת נוכחות לפי תלמיד
router.get('/student', protect, getAttendanceByStudent);

// דוחות
router.get('/reports/comparison', protect, getComparisonReport);

module.exports = router; 