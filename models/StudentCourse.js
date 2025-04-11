const mongoose = require('mongoose');

const StudentCourseSchema = new mongoose.Schema({
    student: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Student',
        required: true
    },
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    stream: {
        type: Number,
        required: true,
        enum: [1, 2]
    },
    startDate: {
        type: Date,
        default: Date.now
    },
    endDate: {
        type: Date
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
});

// אינדקס משולב על תלמיד וקורס
StudentCourseSchema.index({ student: 1, course: 1 }, { unique: true });

module.exports = mongoose.model('StudentCourse', StudentCourseSchema); 