require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const ZoneData = require('../models/ZoneData');
const seedData = require('../data/zoneData.json');

const seedDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    await ZoneData.deleteMany({});
    console.log('Cleared existing zone data');

    const result = await ZoneData.insertMany(seedData);
    console.log(`Successfully seeded ${result.length} zones:`);
    result.forEach(zone => console.log(`  ✓ ${zone.name} (${zone.zoneId})`));

    process.exit(0);
  } catch (err) {
    console.error('Seed error:', err.message);
    process.exit(1);
  }
};

seedDB();
