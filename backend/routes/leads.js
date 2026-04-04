const express = require('express');
const router = express.Router();
const Lead = require('../models/Lead');

// POST /api/leads — submit a new lead
router.post('/', async (req, res) => {
  try {
    const { name, phone, budget, profession, familySize, interestedZone } = req.body;
    const lead = await Lead.create({
      name,
      phone,
      budget,
      profession,
      familySize,
      interestedZone
    });
    res.status(201).json({
      success: true,
      message: 'Thank you! We will contact you shortly.',
      lead
    });
  } catch (err) {
    if (err.name === 'ValidationError') {
      const errors = Object.values(err.errors).map(e => e.message);
      return res.status(400).json({ success: false, errors });
    }
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// GET /api/leads — list all leads (admin use)
router.get('/', async (req, res) => {
  try {
    const leads = await Lead.find().sort({ createdAt: -1 });
    res.json(leads);
  } catch (err) {
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
