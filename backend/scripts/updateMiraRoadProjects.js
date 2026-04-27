require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const ZoneData = require('../models/ZoneData');
const seedData = require('../data/zoneData.json');

const updateMiraRoadProjects = async () => {
  try {
    const miraRoadZone = seedData.find((zone) => zone.zoneId === 'mira-road');
    if (!miraRoadZone || !Array.isArray(miraRoadZone.projects)) {
      throw new Error('mira-road projects not found in seed data');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await ZoneData.updateOne(
      { zoneId: 'mira-road' },
      { $set: { projects: miraRoadZone.projects } }
    );

    if (result.matchedCount === 0) {
      console.error('No zone found with zoneId "mira-road"');
      process.exit(1);
    }

    console.log(
      `Updated mira-road projects successfully (modified: ${result.modifiedCount})`
    );
    process.exit(0);
  } catch (err) {
    console.error('Update error:', err.message);
    process.exit(1);
  }
};

updateMiraRoadProjects();
