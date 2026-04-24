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
  bhk: {
    type: String,
    required: [true, 'BHK is required'],
    enum: {
      values: [
        '1 BHK',
        '2 BHK',
        '3 BHK',
        '4 BHK',
        '5+ BHK'
      ],
      message: '{VALUE} is not a valid BHK option'
    }
  },
  locationPreferred: {
    type: String,
    required: [true, 'Preferred location is required'],
    trim: true,
    maxlength: [150, 'Preferred location cannot exceed 150 characters']
  },
  specificRequirement: {
    type: String,
    required: [true, 'Specific requirement is required'],
    trim: true,
    maxlength: [1000, 'Specific requirement cannot exceed 1000 characters']
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
