const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const { updatePasswords } = require('../config/auth');
const Student = require('../models/Student');
const Course = require('../models/Course');
const StudentCourse = require('../models/StudentCourse');
const Upload = require('../models/Upload');

// העלאת קובץ CSV ועדכון בסיס הנתונים
const uploadCsv = async (req, res) => {
    try {
        console.log('Starting CSV upload process');
        
        if (!req.files || !req.files.csvFile) {
            console.log('No CSV file found in request');
            return res.status(400).json({
                success: false,
                message: 'לא נמצא קובץ CSV'
            });
        }
        
        const csvFile = req.files.csvFile;
        console.log('CSV file received:', csvFile.name, 'Size:', csvFile.size);
        
        const filePath = path.join(__dirname, '../uploads', csvFile.name);
        
        // יצירת תיקייה להעלאות אם לא קיימת
        const uploadsDir = path.join(__dirname, '../uploads');
        if (!fs.existsSync(uploadsDir)) {
            console.log('Creating uploads directory');
            fs.mkdirSync(uploadsDir, { recursive: true });
        }
        
        // שמירת הקובץ
        console.log('Moving file to:', filePath);
        await csvFile.mv(filePath);
        console.log('File saved successfully');
        
        // תוצאות העיבוד
        const results = {
            addedStudents: 0,
            updatedStudents: 0,
            changedCourses: 0
        };
        
        // עיבוד הקובץ
        const students = [];
        
        console.log('Starting to parse CSV file');
        await new Promise((resolve, reject) => {
            fs.createReadStream(filePath)
                .pipe(csv())
                .on('data', (row) => {
                    // המרת מפתחות עמודות בעברית לאנגלית לפי הצורך
                    const normalizedRow = {
                        studentId: row['מס\' תלמיד'] || row['studentId'],
                        lastName: row['משפחה'] || row['lastName'],
                        firstName: row['פרטי'] || row['firstName'],
                        stream1Course: row['רצועה ראשונה'] || row['stream1Course'],
                        stream2Course: row['רצועה שניה'] || row['stream2Course']
                    };
                    
                    students.push(normalizedRow);
                })
                .on('end', () => {
                    console.log(`CSV parsed successfully: ${students.length} students found`);
                    resolve();
                })
                .on('error', (error) => {
                    console.error('Error parsing CSV:', error);
                    reject(error);
                });
        });
        
        // עיבוד הנתונים ועדכון בסיס הנתונים
        console.log('Processing student data and updating database');
        for (const studentData of students) {
            // בדיקה שכל השדות הנדרשים קיימים
            if (!studentData.studentId || !studentData.lastName || !studentData.firstName) {
                console.log('Skipping student with missing data:', studentData);
                continue;
            }
            
            // בדיקה אם התלמיד כבר קיים
            let student = await Student.findOne({ studentId: studentData.studentId });
            
            if (student) {
                // עדכון תלמיד קיים
                console.log(`Updating existing student: ${studentData.studentId} - ${studentData.firstName} ${studentData.lastName}`);
                student.lastName = studentData.lastName;
                student.firstName = studentData.firstName;
                student.status = 'active';
                await student.save();
                results.updatedStudents++;
            } else {
                // יצירת תלמיד חדש
                console.log(`Creating new student: ${studentData.studentId} - ${studentData.firstName} ${studentData.lastName}`);
                student = await Student.create({
                    studentId: studentData.studentId,
                    lastName: studentData.lastName,
                    firstName: studentData.firstName,
                    status: 'active'
                });
                results.addedStudents++;
            }
            
            // טיפול בקורסים ושיוכים
            try {
                await processStudentCourses(student, studentData, results);
            } catch (error) {
                console.error(`Error processing courses for student ${student.studentId}:`, error);
                // ממשיכים לסטודנט הבא במקום לזרוק שגיאה
            }
        }
        
        // תיעוד ההעלאה
        console.log('Creating upload record in history');
        await Upload.create({
            filename: csvFile.name,
            addedStudents: results.addedStudents,
            updatedStudents: results.updatedStudents,
            changedCourses: results.changedCourses,
            uploadedBy: req.user.role
        });
        
        // מחיקת הקובץ הזמני לאחר העיבוד
        console.log('Deleting temporary file');
        fs.unlinkSync(filePath);
        
        console.log('CSV processing completed successfully with results:', results);
        res.json({
            success: true,
            message: 'קובץ CSV נטען והנתונים עודכנו בהצלחה',
            ...results
        });
    } catch (error) {
        console.error('Error uploading CSV:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({
            success: false,
            message: 'שגיאה בהעלאת והטמעת קובץ ה-CSV: ' + error.message
        });
    }
};

// פונקציית עזר לעיבוד קורסים ושיוכים לתלמיד
const processStudentCourses = async (student, studentData, results) => {
    try {
        // טיפול בקורס רצועה 1
        if (studentData.stream1Course && studentData.stream1Course !== '*לא ידוע1*') {
            console.log(`Processing stream 1 course for student ${student.studentId}: ${studentData.stream1Course}`);
            let course = await Course.findOne({ name: studentData.stream1Course, stream: 1 });
            
            if (!course) {
                // יצירת קורס חדש אם לא קיים
                console.log(`Creating new course for stream 1: ${studentData.stream1Course}`);
                course = await Course.create({
                    name: studentData.stream1Course,
                    stream: 1,
                    status: 'active'
                });
            }
            
            // בדיקה ועדכון שיוך תלמיד-קורס
            await updateStudentCourse(student, course, 1, results);
        }
        
        // טיפול בקורס רצועה 2
        if (studentData.stream2Course && studentData.stream2Course !== '*לא ידוע2*') {
            console.log(`Processing stream 2 course for student ${student.studentId}: ${studentData.stream2Course}`);
            let course = await Course.findOne({ name: studentData.stream2Course, stream: 2 });
            
            if (!course) {
                // יצירת קורס חדש אם לא קיים
                console.log(`Creating new course for stream 2: ${studentData.stream2Course}`);
                course = await Course.create({
                    name: studentData.stream2Course,
                    stream: 2,
                    status: 'active'
                });
            }
            
            // בדיקה ועדכון שיוך תלמיד-קורס
            await updateStudentCourse(student, course, 2, results);
        }
    } catch (error) {
        console.error(`Error in processStudentCourses for student ${student.studentId}:`, error);
        throw error; // רצוי להעביר את השגיאה הלאה לטיפול ברמה גבוהה יותר
    }
};

// פונקציית עזר לעדכון שיוך תלמיד-קורס
const updateStudentCourse = async (student, course, stream, results) => {
    try {
        console.log(`Updating student-course enrollment: Student ${student.studentId}, Course ${course.name}, Stream ${stream}`);
        
        // בדיקה אם קיים שיוך קודם באותה רצועה
        const existingEnrollments = await StudentCourse.find({
            student: student._id,
            stream,
            status: 'active'
        }).populate('course');
        
        console.log(`Found ${existingEnrollments.length} existing enrollments for stream ${stream}`);
        
        if (existingEnrollments.length > 0) {
            // בדיקה אם התלמיד כבר רשום לקורס זה
            const existingEnrollment = existingEnrollments.find(
                enrollment => enrollment.course._id.toString() === course._id.toString()
            );
            
            if (existingEnrollment) {
                // התלמיד כבר רשום לקורס זה - אין צורך בשינוי
                console.log(`Student already enrolled in course ${course.name} - no change needed`);
                return;
            }
            
            // התלמיד רשום לקורס אחר באותה רצועה - נעדכן
            console.log(`Updating enrollments: changing from another course to ${course.name}`);
            for (const enrollment of existingEnrollments) {
                console.log(`Setting enrollment for course ${enrollment.course.name} to inactive`);
                enrollment.status = 'inactive';
                enrollment.endDate = new Date();
                await enrollment.save();
            }
            
            results.changedCourses++;
        }
        
        // יצירת שיוך חדש
        console.log(`Creating new enrollment for student ${student.studentId} in course ${course.name}`);
        await StudentCourse.create({
            student: student._id,
            course: course._id,
            stream,
            status: 'active'
        });
        
        console.log('Enrollment created successfully');
    } catch (error) {
        console.error(`Error in updateStudentCourse for student ${student.studentId}, course ${course.name}:`, error);
        throw error;
    }
};

// עדכון סיסמאות המערכת
const updateSystemPasswords = async (req, res) => {
    try {
        const { teacherPassword, adminPassword } = req.body;
        
        // בדיקה שיש לפחות סיסמה אחת לעדכון
        if (!teacherPassword && !adminPassword) {
            return res.status(400).json({
                success: false,
                message: 'לא סופקו סיסמאות לעדכון'
            });
        }
        
        // עדכון הסיסמאות
        const result = await updatePasswords({
            teacherPassword,
            adminPassword
        });
        
        res.json({
            success: true,
            message: 'הסיסמאות עודכנו בהצלחה'
        });
    } catch (error) {
        console.error('Error updating passwords:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בעדכון הסיסמאות'
        });
    }
};

// קבלת היסטוריית העלאות
const getUploadHistory = async (req, res) => {
    try {
        const uploads = await Upload.find().sort({ date: -1 });
        
        res.json(uploads);
    } catch (error) {
        console.error('Error fetching upload history:', error);
        res.status(500).json({
            success: false,
            message: 'שגיאה בטעינת היסטוריית ההעלאות'
        });
    }
};

module.exports = {
    uploadCsv,
    updateSystemPasswords,
    getUploadHistory
}; 