const mongoose = require('mongoose');

const AttendanceSchema = new mongoose.Schema({
    lesson: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Lesson',
        required: true
    },
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    status: {
        type: String,
        enum: ['present', 'absent', 'late', 'early-leave'],
        required: true
    },
    notes: {
        type: String,
        trim: true
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    updatedBy: {
        type: String,
        trim: true
    }
});

// אינדקס משולב על שיעור ותלמיד
AttendanceSchema.index({ lesson: 1, student: 1 }, { unique: true });

module.exports = mongoose.model('Attendance', AttendanceSchema); 