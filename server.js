const express = require('express');
const cors = require('cors');
const path = require('path');
const morgan = require('morgan');
const fileUpload = require('express-fileupload');
const connectDB = require('./config/db');
const { initializePasswords } = require('./config/auth');

// יבוא הנתיבים
const authRoutes = require('./routes/authRoutes');
const courseRoutes = require('./routes/courseRoutes');
const studentRoutes = require('./routes/studentRoutes');
const attendanceRoutes = require('./routes/attendanceRoutes');
const adminRoutes = require('./routes/adminRoutes');

// התחברות למסד הנתונים
connectDB();

// אתחול סיסמאות ברירת מחדל
initializePasswords();

// יצירת האפליקציה
const app = express();

// מידלווארס בסיסיים
app.use(morgan('dev')); // לוגים
app.use(cors({
    origin: true,
    credentials: true
})); // אפשור CORS
app.use(express.json()); // פענוח JSON
app.use(express.urlencoded({ extended: false })); // פענוח טפסים
app.use(fileUpload({
    createParentPath: true,
    limits: { fileSize: 5 * 1024 * 1024 } // 5MB מקסימום
}));

// הגדרת נתיבי ה-API
app.use('/api/auth', authRoutes);
app.use('/api/courses', courseRoutes);
app.use('/api/students', studentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/admin', adminRoutes);

// שירות הקבצים הסטטיים מתיקיית public
app.use(express.static(path.join(__dirname, 'public')));

// הפניית כל הבקשות שלא התאימו לנתיבי ה-API אל דף ה-index.html
app.get('*', (req, res) => {
    res.sendFile(path.resolve(__dirname, 'public', 'index.html'));
});

// טיפול בשגיאות
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    console.error('Error Stack:', err.stack);
    
    const statusCode = err.statusCode || 500;
    const message = err.message || 'שגיאת שרת';
    
    res.status(statusCode).json({
        success: false,
        message
    });
});

// הגדרת פורט לשימוש, אם יש בסביבה או ברירת מחדל 8080
const PORT = process.env.PORT || 8080;

// האזנה לפורט
app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server is running on port ${PORT}`);
    
    // יצירת סיסמאות ברירת מחדל
    initializePasswords();
});

// טיפול בסגירה חלקה
process.on('SIGINT', () => {
    console.log('השרת נסגר');
    process.exit(0);
}); 