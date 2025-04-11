const Attendance = require('../models/Attendance');
const Lesson = require('../models/Lesson');
const Student = require('../models/Student');
const Course = require('../models/Course');

// שמירת נוכחות תלמידים בשיעור
const saveAttendance = async (req, res) => {
    try {
        const { attendanceRecords } = req.body;
        
        if (!attendanceRecords || !Array.isArray(attendanceRecords) || !attendanceRecords.length) {
            return res.status(400).json({
                success: false,
                message: 'נא לספק רשימת נוכחות תקינה'
            });
        }
        
        const results = [];
        
        // עיבוד כל רשומות הנוכחות
        for (const record of attendanceRecords) {
            const { studentId, courseId, date, status, notes } = record;
            
            // בדיקת שדות חובה
            if (!studentId || !courseId || !date || !status) {
                results.push({
                    success: false,
                    message: 'נתוני נוכחות חסרים',
                    record
                });
                continue;
            }
            
            // בדיקה אם הסטטוס תקף
            const validStatuses = ['present', 'absent', 'late', 'early-leave'];
            if (!validStatuses.includes(status)) {
                results.push({
                    success: false,
                    message: 'סטטוס לא חוקי',
                    record
                });
                continue;
            }
            
            try {
                // מציאת השיעור או יצירת חדש
                let lesson = await Lesson.findOne({
                    course: courseId,
                    date: new Date(date)
                });
                
                if (!lesson) {
                    lesson = await Lesson.create({
                        course: courseId,
                        date: new Date(date)
                    });
                }
                
                // מציאת התלמיד לפי מספר תלמיד
                const student = await Student.findOne({ studentId });
                
                if (!student) {
                    results.push({
                        success: false,
                        message: 'התלמיד לא נמצא',
                        record
                    });
                    continue;
                }
                
                // מציאת רשומת נוכחות קיימת או יצירת חדשה
                let attendance = await Attendance.findOne({
                    lesson: lesson._id,
                    student: student._id
                });
                
                if (attendance) {
                    // עדכון רשומה קיימת
                    attendance.status = status;
                    
                    if (notes !== undefined) {
                        attendance.notes = notes;
                    }
                    
                    attendance.updatedAt = new Date();
                    attendance.updatedBy = req.user ? req.user.role : 'teacher';
                    
                    await attendance.save();
                } else {
                    // יצירת רשומה חדשה
                    attendance = await Attendance.create({
                        lesson: lesson._id,
                        student: student._id,
                        status,
                        notes,
                        updatedBy: req.user ? req.user.role : 'teacher'
                    });
                }
                
                results.push({
                    success: true,
                    attendanceId: attendance._id,
                    studentId,
                    courseId,
                    date
                });
            } catch (error) {
                console.error('Error processing attendance record:', error);
                results.push({
                    success: false,
                    message: 'שגיאה בעיבוד רשומת הנוכחות',
                    record,
                    error: error.message
                });
            }
        }
        
        // בדיקה אם כל הרשומות עובדו בהצלחה
        const allSuccessful = results.every(result => result.success);
        
        if (allSuccessful) {
            res.json({
                success: true,
                message: 'כל רשומות הנוכחות נשמרו בהצלחה',
                results
            });
        } else {
            // אם חלק מהרשומות נכשלו
            res.status(207).json({
                success: false,
                message: 'חלק מרשומות הנוכחות לא נשמרו בהצלחה',
                results
            });
        }
    } catch (error) {
        console.error('Error saving attendance:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בשמירת נתוני הנוכחות'
        });
    }
};

// קבלת נוכחות לפי שיעור
const getAttendanceByLesson = async (req, res) => {
    try {
        const { courseId, date } = req.query;
        
        if (!courseId || !date) {
            return res.status(400).json({
                success: false,
                message: 'נא לספק מזהה קורס ותאריך'
            });
        }
        
        // מציאת השיעור
        const lesson = await Lesson.findOne({
            course: courseId,
            date: new Date(date)
        });
        
        if (!lesson) {
            return res.json([]);
        }
        
        // קבלת נתוני הנוכחות
        const attendanceRecords = await Attendance.find({ lesson: lesson._id })
            .populate('student', 'studentId firstName lastName')
            .sort({ 'student.lastName': 1, 'student.firstName': 1 });
        
        res.json(attendanceRecords);
    } catch (error) {
        console.error('Error fetching attendance:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת נתוני הנוכחות'
        });
    }
};

// קבלת נוכחות לפי תלמיד
const getAttendanceByStudent = async (req, res) => {
    try {
        const { studentId, startDate, endDate } = req.query;
        
        if (!studentId) {
            return res.status(400).json({
                success: false,
                message: 'נא לספק מזהה תלמיד'
            });
        }
        
        // מציאת התלמיד לפי מספר תלמיד
        const student = await Student.findOne({ studentId });
        
        if (!student) {
            return res.status(404).json({
                success: false,
                message: 'התלמיד לא נמצא'
            });
        }
        
        // בניית תנאי החיפוש
        const query = { student: student._id };
        
        if (startDate || endDate) {
            query.updatedAt = {};
            
            if (startDate) {
                query.updatedAt.$gte = new Date(startDate);
            }
            
            if (endDate) {
                query.updatedAt.$lte = new Date(endDate);
            }
        }
        
        // קבלת נתוני הנוכחות
        const attendanceRecords = await Attendance.find(query)
            .populate({
                path: 'lesson',
                select: 'date',
                populate: {
                    path: 'course',
                    select: 'name stream'
                }
            })
            .sort({ 'lesson.date': -1 });
        
        res.json(attendanceRecords);
    } catch (error) {
        console.error('Error fetching student attendance:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת נתוני הנוכחות'
        });
    }
};

// הפקת דוח השוואת רצועות (תלמידים שנכחו ברצועה 1 ולא נכחו ברצועה 2)
const getComparisonReport = async (req, res) => {
    try {
        const { date } = req.query;
        
        if (!date) {
            return res.status(400).json({
                success: false,
                message: 'נא לספק תאריך'
            });
        }
        
        const reportDate = new Date(date);
        
        // 1. מציאת כל השיעורים בתאריך הנבחר
        const lessons = await Lesson.find({
            date: {
                $gte: new Date(reportDate.setHours(0, 0, 0, 0)),
                $lte: new Date(reportDate.setHours(23, 59, 59, 999))
            }
        }).populate('course', 'name stream');
        
        if (!lessons.length) {
            return res.json({
                date,
                students: []
            });
        }
        
        // מיון השיעורים לפי רצועות
        const stream1Lessons = lessons.filter(lesson => lesson.course.stream === 1);
        const stream2Lessons = lessons.filter(lesson => lesson.course.stream === 2);
        
        const stream1LessonIds = stream1Lessons.map(lesson => lesson._id);
        const stream2LessonIds = stream2Lessons.map(lesson => lesson._id);
        
        if (!stream1LessonIds.length || !stream2LessonIds.length) {
            return res.json({
                date,
                students: []
            });
        }
        
        // 2. מציאת תלמידים שנכחו בשיעורי רצועה 1
        const attendanceStream1 = await Attendance.find({
            lesson: { $in: stream1LessonIds },
            status: 'present'
        }).populate('student').populate({
            path: 'lesson',
            populate: {
                path: 'course'
            }
        });
        
        // מיפוי התלמידים שנכחו ברצועה 1
        const presentInStream1 = attendanceStream1.map(att => ({
            studentId: att.student.studentId,
            studentObjectId: att.student._id,
            firstName: att.student.firstName,
            lastName: att.student.lastName,
            stream1Course: att.lesson.course.name
        }));
        
        if (!presentInStream1.length) {
            return res.json({
                date,
                students: []
            });
        }
        
        // 3. מציאת תלמידים שנעדרו מרצועה 2
        const studentIds = presentInStream1.map(s => s.studentObjectId);
        
        const attendanceStream2 = await Attendance.find({
            lesson: { $in: stream2LessonIds },
            student: { $in: studentIds },
            status: 'present'
        }).populate('student');
        
        // רשימת מזהי תלמידים שנכחו גם ברצועה 2
        const presentInStream2Ids = attendanceStream2.map(att => att.student.studentId);
        
        // 4. סינון התלמידים שנכחו ברצועה 1 ולא נכחו ברצועה 2
        const result = [];
        
        for (const student of presentInStream1) {
            if (!presentInStream2Ids.includes(student.studentId)) {
                // מציאת הקורס ברצועה 2
                const studentCourses = await StudentCourse.find({
                    student: student.studentObjectId,
                    stream: 2,
                    status: 'active'
                }).populate('course', 'name');
                
                const stream2Course = studentCourses.length ? studentCourses[0].course.name : 'לא רשום לקורס';
                
                result.push({
                    studentId: student.studentId,
                    firstName: student.firstName,
                    lastName: student.lastName,
                    stream1Course: student.stream1Course,
                    stream2Course
                });
            }
        }
        
        res.json({
            date,
            students: result
        });
    } catch (error) {
        console.error('Error generating comparison report:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בהפקת דוח ההשוואה'
        });
    }
};

module.exports = {
    saveAttendance,
    getAttendanceByLesson,
    getAttendanceByStudent,
    getComparisonReport
}; 