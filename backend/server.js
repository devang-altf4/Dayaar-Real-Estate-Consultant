require('dotenv').config();
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');

const app = express();

// Middleware
const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:5173',
  'https://dayaarrealestate.com',
  'https://www.dayaarrealestate.com',
  'https://dayaar-real-estate-consultant.vercel.app',
  process.env.CLIENT_URL
].filter(Boolean);

app.use(cors({ 
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH']
}));
app.use(express.json({ limit: '10kb' }));

// Routes
app.use('/api/zones', require('./routes/zones'));
app.use('/api/leads', require('./routes/leads'));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Connect & Start
const PORT = process.env.PORT || 5000;
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Dayaar API running on port ${PORT}`);
    console.log(`Environment: ${process.env.NODE_ENV}`);
  });
});
