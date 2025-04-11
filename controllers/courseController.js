const Course = require('../models/Course');

// קבלת כל הקורסים
const getCourses = async (req, res) => {
    try {
        const courses = await Course.find({ status: 'active' }).sort({ stream: 1, name: 1 });
        
        res.json(courses);
    } catch (error) {
        console.error('Error fetching courses:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת הקורסים'
        });
    }
};

// קבלת קורס לפי מזהה
const getCourseById = async (req, res) => {
    try {
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'הקורס לא נמצא'
            });
        }
        
        res.json(course);
    } catch (error) {
        console.error('Error fetching course:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת הקורס'
        });
    }
};

// יצירת קורס חדש
const createCourse = async (req, res) => {
    try {
        const { name, stream, instructor, description } = req.body;
        
        // בדיקת שדות חובה
        if (!name || !stream) {
            return res.status(400).json({
                success: false,
                message: 'נא לספק שם וערך רצועה'
            });
        }
        
        // יצירת קורס חדש
        const course = await Course.create({
            name,
            stream,
            instructor,
            description
        });
        
        res.status(201).json({
            success: true,
            course
        });
    } catch (error) {
        console.error('Error creating course:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת הקורס'
        });
    }
};

// עדכון פרטי קורס
const updateCourse = async (req, res) => {
    try {
        const { name, stream, instructor, description, status } = req.body;
        
        // מציאת הקורס ועדכונו
        const course = await Course.findById(req.params.id);
        
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'הקורס לא נמצא'
            });
        }
        
        // עדכון השדות שסופקו
        if (name) course.name = name;
        if (stream) course.stream = stream;
        if (instructor !== undefined) course.instructor = instructor;
        if (description !== undefined) course.description = description;
        if (status) course.status = status;
        
        // שמירת השינויים
        await course.save();
        
        res.json({
            success: true,
            course
        });
    } catch (error) {
        console.error('Error updating course:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון הקורס'
        });
    }
};

// מחיקת קורס (סימון כלא פעיל)
const deleteCourse = async (req, res) => {
    try {
        // מציאת הקורס וסימונו כלא פעיל
        const course = await Course.findByIdAndUpdate(
            req.params.id,
            { status: 'inactive' },
            { new: true }
        );
        
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'הקורס לא נמצא'
            });
        }
        
        res.json({
            success: true,
            message: 'הקורס סומן כלא פעיל בהצלחה'
        });
    } catch (error) {
        console.error('Error deleting course:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה במחיקת הקורס'
        });
    }
};

module.exports = {
    getCourses,
    getCourseById,
    createCourse,
    updateCourse,
    deleteCourse
}; 