const mongoose = require('mongoose');

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [100, 'Name cannot exceed 100 characters']
  },
  phone: {
    type: String,
    required: [true, 'Phone number is required'],
    match: [/^[6-9]\d{9}$/, 'Please enter a valid 10-digit Indian phone number']
  },
  budget: {
    type: String,
    required: [true, 'Budget is required'],
    enum: {
      values: [
        'Under ₹50 Lakh',
        '₹50 Lakh – ₹1 Crore',
        '₹1 – ₹2 Crore',
        '₹2 – ₹5 Crore',
        '₹5 – ₹10 Crore',
        '₹10 Crore+'
      ],
      message: '{VALUE} is not a valid budget range'
    }
  },
  profession: {
    type: String,
    required: [true, 'Profession is required'],
    trim: true,
    maxlength: [100, 'Profession cannot exceed 100 characters']
  },
  familySize: {
    type: Number,
    required: [true, 'Family size is required'],
    min: [1, 'Family size must be at least 1'],
    max: [20, 'Family size cannot exceed 20']
  },
  interestedZone: {
    type: String,
    default: null
  },
  source: {
    type: String,
    default: 'website'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Lead', leadSchema);
