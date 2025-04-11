const Student = require('../models/Student');
const Course = require('../models/Course');
const StudentCourse = require('../models/StudentCourse');

// קבלת כל התלמידים
const getStudents = async (req, res) => {
    try {
        const students = await Student.find({ status: 'active' }).sort({ lastName: 1, firstName: 1 });
        
        res.json(students);
    } catch (error) {
        console.error('Error fetching students:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת התלמידים'
        });
    }
};

// קבלת תלמיד לפי מזהה
const getStudentById = async (req, res) => {
    try {
        const student = await Student.findById(req.params.id);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'התלמיד לא נמצא'
            });
        }
        
        res.json(student);
    } catch (error) {
        console.error('Error fetching student:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת התלמיד'
        });
    }
};

// קבלת תלמידים לפי קורס
const getStudentsByCourse = async (req, res) => {
    try {
        const courseId = req.params.courseId;
        
        // קבלת רשימת מזהי התלמידים בקורס
        const studentCourses = await StudentCourse.find({
            course: courseId,
            status: 'active'
        });
        
        if (!studentCourses.length) {
            return res.json([]);
        }
        
        // מיפוי מזהי התלמידים
        const studentIds = studentCourses.map(sc => sc.student);
        
        // קבלת נתוני התלמידים המלאים
        const students = await Student.find({
            _id: { $in: studentIds },
            status: 'active'
        }).sort({ lastName: 1, firstName: 1 });
        
        res.json(students);
    } catch (error) {
        console.error('Error fetching students by course:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת התלמידים'
        });
    }
};

// יצירת תלמיד חדש
const createStudent = async (req, res) => {
    try {
        const { studentId, firstName, lastName, contactInfo } = req.body;
        
        // בדיקת שדות חובה
        if (!studentId || !firstName || !lastName) {
            return res.status(400).json({
                success: false,
                message: 'נא לספק מספר תלמיד, שם פרטי ושם משפחה'
            });
        }
        
        // בדיקה אם מספר התלמיד כבר קיים
        const existingStudent = await Student.findOne({ studentId });
        
        if (existingStudent) {
            return res.status(400).json({
                success: false,
                message: 'מספר התלמיד כבר קיים במערכת'
            });
        }
        
        // יצירת תלמיד חדש
        const student = await Student.create({
            studentId,
            firstName,
            lastName,
            contactInfo
        });
        
        res.status(201).json({
            success: true,
            student
        });
    } catch (error) {
        console.error('Error creating student:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה ביצירת התלמיד'
        });
    }
};

// עדכון פרטי תלמיד
const updateStudent = async (req, res) => {
    try {
        const { firstName, lastName, contactInfo, status } = req.body;
        
        // מציאת התלמיד ועדכונו
        const student = await Student.findById(req.params.id);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'התלמיד לא נמצא'
            });
        }
        
        // עדכון השדות שסופקו
        if (firstName) student.firstName = firstName;
        if (lastName) student.lastName = lastName;
        if (contactInfo !== undefined) student.contactInfo = contactInfo;
        if (status) student.status = status;
        
        // שמירת השינויים
        await student.save();
        
        res.json({
            success: true,
            student
        });
    } catch (error) {
        console.error('Error updating student:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון התלמיד'
        });
    }
};

// מחיקת תלמיד (סימון כלא פעיל)
const deleteStudent = async (req, res) => {
    try {
        // מציאת התלמיד וסימונו כלא פעיל
        const student = await Student.findByIdAndUpdate(
            req.params.id,
            { status: 'inactive' },
            { new: true }
        );
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'התלמיד לא נמצא'
            });
        }
        
        res.json({
            success: true,
            message: 'התלמיד סומן כלא פעיל בהצלחה'
        });
    } catch (error) {
        console.error('Error deleting student:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה במחיקת התלמיד'
        });
    }
};

// שיוך תלמיד לקורס
const addStudentToCourse = async (req, res) => {
    try {
        const { studentId, courseId, stream } = req.body;
        
        // בדיקת שדות חובה
        if (!studentId || !courseId || !stream) {
            return res.status(400).json({
                success: false,
                message: 'נא לספק את כל השדות הנדרשים'
            });
        }
        
        // בדיקה אם התלמיד קיים
        const student = await Student.findById(studentId);
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'התלמיד לא נמצא'
            });
        }
        
        // בדיקה אם הקורס קיים
        const course = await Course.findById(courseId);
        
        if (!course) {
            return res.status(404).json({
                success: false,
                message: 'הקורס לא נמצא'
            });
        }
        
        // בדיקה אם השיוך כבר קיים
        let studentCourse = await StudentCourse.findOne({
            student: studentId,
            course: courseId
        });
        
        if (studentCourse) {
            // עדכון שיוך קיים
            studentCourse.stream = stream;
            studentCourse.status = 'active';
            
            if (studentCourse.endDate) {
                studentCourse.endDate = null;
            }
            
            await studentCourse.save();
        } else {
            // יצירת שיוך חדש
            studentCourse = await StudentCourse.create({
                student: studentId,
                course: courseId,
                stream
            });
        }
        
        res.status(201).json({
            success: true,
            studentCourse
        });
    } catch (error) {
        console.error('Error adding student to course:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בשיוך התלמיד לקורס'
        });
    }
};

// הסרת תלמיד מקורס
const removeStudentFromCourse = async (req, res) => {
    try {
        const { studentId, courseId } = req.params;
        
        // בדיקה אם השיוך קיים
        const studentCourse = await StudentCourse.findOne({
            student: studentId,
            course: courseId
        });
        
        if (!studentCourse) {
            return res.status(404).json({
                success: false,
                message: 'השיוך לא נמצא'
            });
        }
        
        // סימון השיוך כלא פעיל וקביעת תאריך סיום
        studentCourse.status = 'inactive';
        studentCourse.endDate = new Date();
        
        await studentCourse.save();
        
        res.json({
            success: true,
            message: 'התלמיד הוסר מהקורס בהצלחה'
        });
    } catch (error) {
        console.error('Error removing student from course:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בהסרת התלמיד מהקורס'
        });
    }
};

module.exports = {
    getStudents,
    getStudentById,
    getStudentsByCourse,
    createStudent,
    updateStudent,
    deleteStudent,
    addStudentToCourse,
    removeStudentFromCourse
}; 