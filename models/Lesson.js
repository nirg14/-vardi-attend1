const mongoose = require('mongoose');

const LessonSchema = new mongoose.Schema({
    course: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Course',
        required: true
    },
    date: {
        type: Date,
        required: true
    },
    topic: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        trim: true
    }
});

// אינדקס משולב על קורס ותאריך
LessonSchema.index({ course: 1, date: 1 }, { unique: true });

module.exports = mongoose.model('Lesson', LessonSchema); 