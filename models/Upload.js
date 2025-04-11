const mongoose = require('mongoose');

const UploadSchema = new mongoose.Schema({
    filename: {
        type: String,
        required: true,
        trim: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    addedStudents: {
        type: Number,
        default: 0
    },
    updatedStudents: {
        type: Number,
        default: 0
    },
    changedCourses: {
        type: Number,
        default: 0
    },
    uploadedBy: {
        type: String,
        default: 'admin'
    }
});

module.exports = mongoose.model('Upload', UploadSchema); 