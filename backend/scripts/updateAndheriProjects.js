require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const mongoose = require('mongoose');
const ZoneData = require('../models/ZoneData');
const seedData = require('../data/zoneData.json');

const updateAndheriProjects = async () => {
  try {
    const andheriZone = seedData.find((zone) => zone.zoneId === 'andheri');
    if (!andheriZone || !Array.isArray(andheriZone.projects)) {
      throw new Error('andheri zone data not found in seed data');
    }

    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    const result = await ZoneData.updateOne(
      { zoneId: 'andheri' },
      { $set: { name: andheriZone.name, projects: andheriZone.projects } }
    );

    if (result.matchedCount === 0) {
      console.error('No zone found with zoneId "andheri"');
      process.exit(1);
    }

    console.log(
      `Updated andheri name/projects successfully (modified: ${result.modifiedCount})`
    );
    process.exit(0);
  } catch (err) {
    console.error('Update error:', err.message);
    process.exit(1);
  }
};

updateAndheriProjects();
