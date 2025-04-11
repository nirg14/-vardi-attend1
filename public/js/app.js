// מחלקה לניהול התקשורת עם השרת
class ApiService {
    constructor() {
        // URL בסיסי לשרת (ישתנה בעת הפריסה)
        this.baseUrl = 'http://localhost:8080/api';
        this.token = localStorage.getItem('token') || null;
    }

    // הגדרת טוקן JWT לאחר התחברות
    setToken(token) {
        this.token = token;
        localStorage.setItem('token', token);
    }

    // הסרת טוקן בעת התנתקות
    removeToken() {
        this.token = null;
        localStorage.removeItem('token');
    }

    // כותרות בסיסיות לבקשות
    get headers() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // פונקציית עזר לביצוע בקשות
    async fetchData(endpoint, method = 'GET', data = null) {
        const url = `${this.baseUrl}${endpoint}`;
        
        const options = {
            method,
            headers: this.headers
        };
        
        if (data && (method === 'POST' || method === 'PUT')) {
            options.body = JSON.stringify(data);
        }
        
        try {
            const response = await fetch(url, options);
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'שגיאה בשרת');
            }
            
            return result;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // התחברות למערכת
    async login(password, role) {
        return this.fetchData('/auth/login', 'POST', { password, role });
    }

    // קבלת רשימת קורסים
    async getCourses() {
        return this.fetchData('/courses');
    }

    // קבלת רשימת תלמידים בקורס
    async getStudentsByCourse(courseId) {
        return this.fetchData(`/students/course/${courseId}`);
    }

    // שמירת נוכחות
    async saveAttendance(attendanceData) {
        return this.fetchData('/attendance', 'POST', attendanceData);
    }

    // הפקת דוח השוואת רצועות
    async getComparisonReport(date) {
        return this.fetchData(`/reports/comparison?date=${date}`);
    }

    // העלאת קובץ CSV
    async uploadCsv(formData) {
        const url = `${this.baseUrl}/admin/upload-csv`;
        
        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${this.token}`
                },
                body: formData,
                credentials: 'include'
            });
            
            const result = await response.json();
            
            if (!response.ok) {
                throw new Error(result.message || 'שגיאה בהעלאת הקובץ');
            }
            
            return result;
        } catch (error) {
            console.error('Upload Error:', error);
            throw error;
        }
    }

    // עדכון סיסמאות
    async updatePasswords(passwords) {
        return this.fetchData('/admin/update-passwords', 'POST', passwords);
    }

    // קבלת היסטוריית העלאות
    async getUploadHistory() {
        return this.fetchData('/admin/upload-history');
    }
}

// מחלקה לניהול התצוגה והאינטראקציה עם המשתמש
class AttendanceApp {
    constructor() {
        this.api = new ApiService();
        this.currentRole = null;
        this.currentCourse = null;
        this.students = [];
        this.attendanceData = {};
        
        this.initEventListeners();
        this.checkAuthentication();
    }

    // בדיקת התחברות קיימת
    checkAuthentication() {
        const token = localStorage.getItem('token');
        const role = localStorage.getItem('role');
        
        if (token && role) {
            this.api.setToken(token);
            this.currentRole = role;
            
            if (role === 'admin') {
                this.showAdminPanel();
            } else {
                this.showCourseSelection();
            }
        }
    }

    // אתחול מאזיני אירועים
    initEventListeners() {
        // מסך התחברות
        document.getElementById('teacher-role-btn').addEventListener('click', () => this.selectRole('teacher'));
        document.getElementById('admin-role-btn').addEventListener('click', () => this.selectRole('admin'));
        document.getElementById('login-btn').addEventListener('click', () => this.login());
        
        // מסך בחירת קורס
        document.getElementById('stream1-select').addEventListener('change', (e) => this.selectCourse(1, e.target.value));
        document.getElementById('stream2-select').addEventListener('change', (e) => this.selectCourse(2, e.target.value));
        document.getElementById('mark-all-present').addEventListener('click', () => this.markAllPresent());
        document.getElementById('reset-attendance').addEventListener('click', () => this.resetAttendance());
        document.getElementById('save-attendance').addEventListener('click', () => this.saveAttendance());
        document.getElementById('comparison-report-btn').addEventListener('click', () => this.showComparisonReport());
        document.getElementById('teacher-logout').addEventListener('click', () => this.logout());
        
        // מסך דוח השוואת רצועות
        document.getElementById('back-to-attendance').addEventListener('click', () => this.backToAttendance());
        document.getElementById('generate-report-btn').addEventListener('click', () => this.generateComparisonReport());
        document.getElementById('share-report-btn').addEventListener('click', () => this.shareReport());
        document.getElementById('download-report-btn').addEventListener('click', () => this.downloadReport());
        
        // מסך ניהול
        document.getElementById('upload-csv-btn').addEventListener('click', () => this.uploadCsv());
        document.getElementById('update-passwords-btn').addEventListener('click', () => this.updatePasswords());
        document.getElementById('admin-logout').addEventListener('click', () => this.logout());
    }

    // בחירת תפקיד בהתחברות
    selectRole(role) {
        this.currentRole = role;
        
        // עדכון מראה כפתורי התפקידים
        if (role === 'teacher') {
            document.getElementById('teacher-role-btn').classList.add('bg-blue-100');
            document.getElementById('teacher-role-btn').classList.remove('bg-white');
            document.getElementById('admin-role-btn').classList.remove('bg-blue-100');
            document.getElementById('admin-role-btn').classList.add('bg-white');
        } else {
            document.getElementById('admin-role-btn').classList.add('bg-blue-100');
            document.getElementById('admin-role-btn').classList.remove('bg-white');
            document.getElementById('teacher-role-btn').classList.remove('bg-blue-100');
            document.getElementById('teacher-role-btn').classList.add('bg-white');
        }
    }

    // התחברות למערכת
    async login() {
        try {
            const password = document.getElementById('password').value;
            
            if (!password) {
                alert('נא להזין סיסמה');
                return;
            }
            
            if (!this.currentRole) {
                alert('נא לבחור תפקיד');
                return;
            }
            
            const response = await this.api.login(password, this.currentRole);
            this.api.setToken(response.token);
            localStorage.setItem('role', this.currentRole);
            
            // מעבר למסך המתאים לפי תפקיד
            if (this.currentRole === 'admin') {
                this.showAdminPanel();
            } else {
                this.showCourseSelection();
            }
        } catch (error) {
            alert('שגיאה בהתחברות: ' + error.message);
        }
    }

    // התנתקות מהמערכת
    logout() {
        this.api.removeToken();
        localStorage.removeItem('role');
        this.showLoginScreen();
    }

    // הצגת מסך התחברות
    showLoginScreen() {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('course-selection').style.display = 'none';
        document.getElementById('comparison-report').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'none';
        
        // איפוס שדות
        document.getElementById('password').value = '';
    }

    // הצגת מסך בחירת קורס
    async showCourseSelection() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('course-selection').style.display = 'block';
        document.getElementById('comparison-report').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'none';
        
        document.getElementById('user-greeting').textContent = 'שלום, מורה';
        
        // הגדרת ערך ברירת מחדל לתאריך
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('attendance-date').value = today;
        
        // טעינת רשימת הקורסים
        try {
            const courses = await this.api.getCourses();
            
            // מיון קורסים לפי רצועות
            const stream1Courses = courses.filter(course => course.stream === 1);
            const stream2Courses = courses.filter(course => course.stream === 2);
            
            // מילוי רשימות הקורסים
            const stream1Select = document.getElementById('stream1-select');
            const stream2Select = document.getElementById('stream2-select');
            
            // איפוס אפשרויות קיימות
            stream1Select.innerHTML = '<option value="" disabled selected>-- בחר קורס רצועה 1 --</option>';
            stream2Select.innerHTML = '<option value="" disabled selected>-- בחר קורס רצועה 2 --</option>';
            
            // הוספת אפשרויות חדשות
            stream1Courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course._id;
                option.textContent = course.name;
                stream1Select.appendChild(option);
            });
            
            stream2Courses.forEach(course => {
                const option = document.createElement('option');
                option.value = course._id;
                option.textContent = course.name;
                stream2Select.appendChild(option);
            });
        } catch (error) {
            console.error('Error loading courses:', error);
            alert('שגיאה בטעינת רשימת הקורסים');
        }
    }

    // בחירת קורס וטעינת רשימת התלמידים
    async selectCourse(stream, courseId) {
        try {
            if (!courseId) return;
            
            this.currentCourse = {
                id: courseId,
                stream
            };
            
            // טעינת רשימת התלמידים בקורס
            this.students = await this.api.getStudentsByCourse(courseId);
            
            // איפוס נתוני נוכחות
            this.attendanceData = {};
            
            // הצגת רשימת התלמידים
            this.renderStudentList();
        } catch (error) {
            console.error('Error loading students:', error);
            alert('שגיאה בטעינת רשימת התלמידים');
        }
    }

    // הצגת רשימת התלמידים בקורס הנבחר
    renderStudentList() {
        const attendanceList = document.getElementById('attendance-list');
        attendanceList.innerHTML = '';
        
        if (!this.students.length) {
            attendanceList.innerHTML = '<div class="bg-white rounded-lg shadow-sm p-4 text-center">אין תלמידים בקורס זה</div>';
            return;
        }
        
        // יצירת רשימת התלמידים עם כפתורי סימון נוכחות
        this.students.forEach(student => {
            const row = document.createElement('div');
            row.className = 'attendance-row bg-white rounded-lg shadow-sm p-3 mb-2 flex items-center justify-between';
            
            // פרטי התלמיד
            const studentInfo = document.createElement('div');
            studentInfo.className = 'student-info';
            studentInfo.innerHTML = `
                <div class="font-medium">${student.lastName} ${student.firstName}</div>
                <div class="text-sm text-gray-500">מס' תלמיד: ${student.studentId}</div>
            `;
            
            // כפתור סימון נוכחות
            const attendanceBtn = document.createElement('button');
            attendanceBtn.className = 'attendance-btn not-marked';
            attendanceBtn.setAttribute('data-student-id', student.studentId);
            attendanceBtn.innerHTML = '?';
            
            // הוספת מאזין אירועים לכפתור
            attendanceBtn.addEventListener('click', () => this.toggleAttendance(student.studentId, attendanceBtn));
            
            row.appendChild(studentInfo);
            row.appendChild(attendanceBtn);
            attendanceList.appendChild(row);
        });
    }

    // החלפת מצב נוכחות תלמיד
    toggleAttendance(studentId, button) {
        // בדיקת המצב הנוכחי
        let currentStatus = this.attendanceData[studentId] || 'not-marked';
        
        // החלפת המצב
        if (currentStatus === 'not-marked') {
            currentStatus = 'present';
            button.innerHTML = '✓';
            button.classList.remove('not-marked');
            button.classList.add('present');
        } else if (currentStatus === 'present') {
            currentStatus = 'absent';
            button.innerHTML = '✕';
            button.classList.remove('present');
            button.classList.add('absent');
        } else {
            currentStatus = 'not-marked';
            button.innerHTML = '?';
            button.classList.remove('absent');
            button.classList.add('not-marked');
        }
        
        // שמירת המצב החדש
        this.attendanceData[studentId] = currentStatus;
    }

    // סימון כל התלמידים כנוכחים
    markAllPresent() {
        const buttons = document.querySelectorAll('.attendance-btn');
        
        buttons.forEach(button => {
            const studentId = button.getAttribute('data-student-id');
            button.innerHTML = '✓';
            button.classList.remove('not-marked', 'absent');
            button.classList.add('present');
            this.attendanceData[studentId] = 'present';
        });
    }

    // איפוס סימוני הנוכחות
    resetAttendance() {
        const buttons = document.querySelectorAll('.attendance-btn');
        
        buttons.forEach(button => {
            const studentId = button.getAttribute('data-student-id');
            button.innerHTML = '?';
            button.classList.remove('present', 'absent');
            button.classList.add('not-marked');
            this.attendanceData[studentId] = 'not-marked';
        });
    }

    // שמירת נתוני הנוכחות בשרת
    async saveAttendance() {
        try {
            if (!this.currentCourse) {
                alert('נא לבחור קורס');
                return;
            }
            
            const date = document.getElementById('attendance-date').value;
            
            if (!date) {
                alert('נא לבחור תאריך');
                return;
            }
            
            // הכנת הנתונים לשמירה
            const attendanceRecords = [];
            
            for (const [studentId, status] of Object.entries(this.attendanceData)) {
                if (status !== 'not-marked') {
                    attendanceRecords.push({
                        studentId,
                        courseId: this.currentCourse.id,
                        date,
                        status
                    });
                }
            }
            
            if (!attendanceRecords.length) {
                alert('לא נמצאו נתוני נוכחות לשמירה');
                return;
            }
            
            await this.api.saveAttendance({ attendanceRecords });
            alert('נתוני הנוכחות נשמרו בהצלחה');
        } catch (error) {
            console.error('Error saving attendance:', error);
            alert('שגיאה בשמירת נתוני הנוכחות');
        }
    }

    // הצגת מסך דוח השוואת רצועות
    showComparisonReport() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('course-selection').style.display = 'none';
        document.getElementById('comparison-report').style.display = 'block';
        document.getElementById('admin-panel').style.display = 'none';
        
        // הגדרת ערך ברירת מחדל לתאריך
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('report-date').value = today;
        
        // איפוס תוצאות קודמות
        document.getElementById('report-results').innerHTML = '';
    }

    // חזרה למסך הנוכחות
    backToAttendance() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('course-selection').style.display = 'block';
        document.getElementById('comparison-report').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'none';
    }

    // הפקת דוח השוואת רצועות
    async generateComparisonReport() {
        try {
            const date = document.getElementById('report-date').value;
            
            if (!date) {
                alert('נא לבחור תאריך');
                return;
            }
            
            const results = await this.api.getComparisonReport(date);
            
            // הצגת התוצאות
            const resultsContainer = document.getElementById('report-results');
            resultsContainer.innerHTML = '';
            
            if (!results.students.length) {
                resultsContainer.innerHTML = '<div class="text-center py-4">לא נמצאו תלמידים שנכחו ברצועה 1 ולא נכחו ברצועה 2 בתאריך זה</div>';
                return;
            }
            
            // כותרת
            const header = document.createElement('div');
            header.className = 'text-sm font-medium text-gray-500 mb-3';
            header.textContent = `נמצאו ${results.students.length} תלמידים שנכחו ברצועה 1 ולא נכחו ברצועה 2 בתאריך ${new Date(date).toLocaleDateString('he-IL')}`;
            resultsContainer.appendChild(header);
            
            // רשימת תלמידים
            const list = document.createElement('div');
            list.className = 'divide-y';
            
            results.students.forEach(student => {
                const item = document.createElement('div');
                item.className = 'py-3';
                item.innerHTML = `
                    <div class="font-medium">${student.lastName} ${student.firstName}</div>
                    <div class="text-sm text-gray-500">מס' תלמיד: ${student.studentId}</div>
                    <div class="flex justify-between text-sm mt-1">
                        <div class="text-green-600">רצועה 1: ${student.stream1Course}</div>
                        <div class="text-red-600">רצועה 2: ${student.stream2Course}</div>
                    </div>
                `;
                list.appendChild(item);
            });
            
            resultsContainer.appendChild(list);
        } catch (error) {
            console.error('Error generating report:', error);
            alert('שגיאה בהפקת הדוח');
        }
    }

    // שיתוף הדוח
    shareReport() {
        alert('פונקציונליות שיתוף הדוח תהיה זמינה בגרסה הבאה');
    }

    // הורדת הדוח
    downloadReport() {
        alert('פונקציונליות הורדת הדוח תהיה זמינה בגרסה הבאה');
    }

    // הצגת מסך ניהול מערכת
    showAdminPanel() {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('course-selection').style.display = 'none';
        document.getElementById('comparison-report').style.display = 'none';
        document.getElementById('admin-panel').style.display = 'block';
        
        // טעינת היסטוריית העלאות
        this.loadUploadHistory();
    }

    // טעינת היסטוריית העלאות קבצים
    async loadUploadHistory() {
        try {
            const history = await this.api.getUploadHistory();
            
            const historyContainer = document.getElementById('upload-history');
            historyContainer.innerHTML = '';
            
            if (!history.length) {
                historyContainer.innerHTML = '<div class="py-3 text-center text-gray-500">אין היסטוריית העלאות</div>';
                return;
            }
            
            history.forEach(item => {
                const historyItem = document.createElement('div');
                historyItem.className = 'py-3';
                
                const date = new Date(item.date).toLocaleDateString('he-IL', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                });
                
                historyItem.innerHTML = `
                    <div class="flex justify-between">
                        <div class="font-medium">${item.filename}</div>
                        <div class="text-sm text-gray-500">${date}</div>
                    </div>
                    <div class="text-sm mt-1">
                        <span class="text-blue-600">${item.addedStudents} תלמידים חדשים</span> | 
                        <span class="text-green-600">${item.updatedStudents} עדכונים</span> | 
                        <span class="text-purple-600">${item.changedCourses} שינויי קורסים</span>
                    </div>
                `;
                
                historyContainer.appendChild(historyItem);
            });
        } catch (error) {
            console.error('Error loading upload history:', error);
            alert('שגיאה בטעינת היסטוריית ההעלאות');
        }
    }

    // העלאת קובץ CSV
    async uploadCsv() {
        try {
            const fileInput = document.getElementById('csv-file');
            
            if (!fileInput.files.length) {
                alert('נא לבחור קובץ');
                return;
            }
            
            const file = fileInput.files[0];
            
            if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
                alert('הקובץ חייב להיות מסוג CSV');
                return;
            }
            
            const formData = new FormData();
            formData.append('csvFile', file);
            
            const response = await this.api.uploadCsv(formData);
            alert(`הקובץ הועלה בהצלחה!\n${response.addedStudents} תלמידים חדשים\n${response.updatedStudents} תלמידים עודכנו\n${response.changedCourses} שינויי קורסים`);
            
            // איפוס שדה הקובץ
            fileInput.value = '';
            
            // עדכון היסטוריית העלאות
            this.loadUploadHistory();
        } catch (error) {
            console.error('Error uploading CSV:', error);
            alert('שגיאה בהעלאת הקובץ');
        }
    }

    // עדכון סיסמאות
    async updatePasswords() {
        try {
            const teacherPassword = document.getElementById('teacher-password').value;
            const adminPassword = document.getElementById('admin-password').value;
            
            if (!teacherPassword && !adminPassword) {
                alert('נא להזין לפחות סיסמה אחת לעדכון');
                return;
            }
            
            const passwords = {};
            
            if (teacherPassword) {
                passwords.teacherPassword = teacherPassword;
            }
            
            if (adminPassword) {
                passwords.adminPassword = adminPassword;
            }
            
            await this.api.updatePasswords(passwords);
            alert('הסיסמאות עודכנו בהצלחה');
            
            // איפוס שדות הסיסמה
            document.getElementById('teacher-password').value = '';
            document.getElementById('admin-password').value = '';
        } catch (error) {
            console.error('Error updating passwords:', error);
            alert('שגיאה בעדכון הסיסמאות');
        }
    }
}

// הפעלת האפליקציה כאשר ה-DOM נטען
document.addEventListener('DOMContentLoaded', () => {
    const app = new AttendanceApp();
}); 