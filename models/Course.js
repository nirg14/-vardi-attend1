const mongoose = require('mongoose');

const CourseSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    stream: {
        type: Number,
        required: true,
        enum: [1, 2],
        description: 'Stream number (1 or 2)'
    },
    instructor: {
        type: String,
        trim: true
    },
    description: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['active', 'inactive'],
        default: 'active'
    }
});

// אינדקס משולב על שם הקורס ומספר הרצועה לוודא שאין כפילויות
CourseSchema.index({ name: 1, stream: 1 }, { unique: true });

module.exports = mongoose.model('Course', CourseSchema); 