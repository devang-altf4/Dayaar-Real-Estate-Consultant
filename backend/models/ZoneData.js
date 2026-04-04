const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema({
  codename: { type: String, required: true },
  tagline: { type: String },
  type: { type: String, default: 'Residential' },
  status: { type: String, default: 'Under Construction' },
  possession: { type: String },
  configs: {
    bhk1: { startingPrice: String, carpet: String },
    bhk2: { startingPrice: String, carpet: String },
    bhk3: { startingPrice: String, carpet: String }
  },
  amenities: [String],
  imageUrl: { type: String }
});

const zoneDataSchema = new mongoose.Schema({
  zoneId: {
    type: String,
    required: true,
    unique: true,
    enum: ['mira-road', 'makabo', 'andheri', 'western-suburbs', 'south-central', 'sobo']
  },
  name: { type: String, required: true },
  subtitle: { type: String },
  description: { type: String },
  color: { type: String },
  gradient: { type: String },
  pricePerSqFt: { type: String },
  rentalYield: { type: String },
  priceRange: {
    bhk1: { price: String, rent: String },
    bhk2: { price: String, rent: String },
    bhk3: { price: String, rent: String }
  },
  demographics: {
    character: String,
    buildingStyle: String,
    connectivity: [String]
  },
  projects: [projectSchema]
}, {
  timestamps: true
});

module.exports = mongoose.model('ZoneData', zoneDataSchema);
