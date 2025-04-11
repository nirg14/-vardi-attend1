const { verifyToken } = require('../config/auth');

// מידלוור לאימות משתמש באמצעות טוקן JWT
const protect = (req, res, next) => {
    try {
        // בדיקה אם קיים טוקן בבקשה
        let token;
        
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
            token = req.headers.authorization.split(' ')[1];
        }
        
        if (!token) {
            return res.status(401).json({
                success: false,
                message: 'אין הרשאה, נדרשת התחברות למערכת'
            });
        }
        
        // אימות הטוקן והוספת נתוני המשתמש לבקשה
        const decoded = verifyToken(token);
        
        if (!decoded) {
            return res.status(401).json({
                success: false,
                message: 'הטוקן אינו תקף או פג תוקף'
            });
        }
        
        req.user = decoded;
        next();
    } catch (error) {
        console.error('Auth middleware error:', error);
        return res.status(401).json({
            success: false,
            message: 'אירעה שגיאה באימות'
        });
    }
};

// מידלוור לאימות אדמין
const adminOnly = (req, res, next) => {
    if (req.user && req.user.role === 'admin') {
        next();
    } else {
        return res.status(403).json({
            success: false,
            message: 'אין הרשאת מנהל לבצע פעולה זו'
        });
    }
};

module.exports = { protect, adminOnly }; 