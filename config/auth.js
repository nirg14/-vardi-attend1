const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');

// בפרויקט אמיתי יש להשתמש בקובץ .env להגדרת ערכים אלה
const jwtSecret = 'student-attendance-system-jwt-secret-key';
const tokenExpire = '7d';

// סיסמאות ברירת מחדל למערכת
let teacherPassword = 'teacher123';
let adminPassword = 'admin123';

// יצירת ה-hash לסיסמאות
const initializePasswords = async () => {
    const saltRounds = 10;
    
    // יצירת hash לסיסמת המורים
    if (teacherPassword && !teacherPassword.startsWith('$2b$')) {
        teacherPassword = await bcrypt.hash(teacherPassword, saltRounds);
    }
    
    // יצירת hash לסיסמת האדמין
    if (adminPassword && !adminPassword.startsWith('$2b$')) {
        adminPassword = await bcrypt.hash(adminPassword, saltRounds);
    }
    
    console.log('Passwords initialized');
};

// פונקציה לעדכון סיסמאות
const updatePasswords = async (passwords) => {
    const saltRounds = 10;
    
    if (passwords.teacherPassword) {
        teacherPassword = await bcrypt.hash(passwords.teacherPassword, saltRounds);
    }
    
    if (passwords.adminPassword) {
        adminPassword = await bcrypt.hash(passwords.adminPassword, saltRounds);
    }
    
    return { 
        success: true,
        message: 'Passwords updated successfully'
    };
};

// פונקציית בדיקת סיסמה
const verifyPassword = async (password, role) => {
    if (role === 'teacher') {
        return await bcrypt.compare(password, teacherPassword);
    } else if (role === 'admin') {
        return await bcrypt.compare(password, adminPassword);
    }
    
    return false;
};

// יצירת טוקן JWT עבור משתמש מאומת
const generateToken = (role) => {
    return jwt.sign(
        { role },
        jwtSecret,
        { expiresIn: tokenExpire }
    );
};

// פונקציית אימות טוקן JWT
const verifyToken = (token) => {
    try {
        return jwt.verify(token, jwtSecret);
    } catch (error) {
        return null;
    }
};

module.exports = {
    initializePasswords,
    updatePasswords,
    verifyPassword,
    generateToken,
    verifyToken
}; 