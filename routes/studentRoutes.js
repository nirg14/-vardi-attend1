const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const {
    getStudents,
    getStudentById,
    getStudentsByCourse,
    createStudent,
    updateStudent,
    deleteStudent,
    addStudentToCourse,
    removeStudentFromCourse
} = require('../controllers/studentController');

// נתיבים המוגנים באימות
router.get('/', protect, getStudents);
router.get('/:id', protect, getStudentById);
router.get('/course/:courseId', protect, getStudentsByCourse);

// נתיבים המוגנים לאדמין בלבד
router.post('/', protect, adminOnly, createStudent);
router.put('/:id', protect, adminOnly, updateStudent);
router.delete('/:id', protect, adminOnly, deleteStudent);
router.post('/enroll', protect, adminOnly, addStudentToCourse);
router.delete('/enroll/:studentId/:courseId', protect, adminOnly, removeStudentFromCourse);

module.exports = router; 