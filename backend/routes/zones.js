const express = require('express');
const router = express.Router();
const ZoneData = require('../models/ZoneData');

// GET /api/zones — all zones (summary without projects)
router.get('/', async (req, res) => {
  try {
    const zones = await ZoneData.find({}, '-projects -demographics');
    res.json(zones);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

// GET /api/zones/:zoneId — single zone with full data including projects
router.get('/:zoneId', async (req, res) => {
  try {
    const zone = await ZoneData.findOne({ zoneId: req.params.zoneId });
    if (!zone) {
      return res.status(404).json({ message: 'Zone not found' });
    }
    res.json(zone);
  } catch (err) {
    res.status(500).json({ message: 'Server error', error: err.message });
  }
});

module.exports = router;
