const { verifyPassword, generateToken } = require('../config/auth');

// התחברות למערכת
const login = async (req, res) => {
    try {
        const { password, role } = req.body;
        
        // בדיקת שדות חובה
        if (!password || !role) {
            return res.status(400).json({
                success: false,
                message: 'נא לספק סיסמה ותפקיד'
            });
        }
        
        // אימות שהתפקיד תקף
        if (role !== 'teacher' && role !== 'admin') {
            return res.status(400).json({
                success: false,
                message: 'תפקיד לא תקף'
            });
        }
        
        // אימות סיסמה
        const isValid = await verifyPassword(password, role);
        
        if (!isValid) {
            return res.status(401).json({
                success: false,
                message: 'סיסמה שגויה'
            });
        }
        
        // יצירת טוקן JWT
        const token = generateToken(role);
        
        // החזרת הטוקן לקליינט
        res.json({
            success: true,
            token,
            role
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בהתחברות'
        });
    }
};

module.exports = {
    login
}; 