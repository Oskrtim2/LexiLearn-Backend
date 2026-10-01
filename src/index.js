require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');
const { sequelize } = require('./models');
const routes = require('./routes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 3001;

// ─── Middleware ─────────────────────────────────────────────────
app.use(helmet());
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  credentials: true,
}));
app.use(morgan('dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Static files (for uploaded documents) ─────────────────────
app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

// ─── API Routes ────────────────────────────────────────────────
app.use('/api', routes);

// ─── Root ──────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'LexiLearn API',
    version: '1.0.0',
    description: 'Adaptive learning platform for students with dyslexia',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth',
      student: '/api/student',
      exercises: '/api/exercises',
      assessment: '/api/assessment',
      dashboard: '/api/dashboard',
      gamification: '/api/gamification',
    },
  });
});

// ─── Error Handler ─────────────────────────────────────────────
app.use(errorHandler);

// ─── Start Server ──────────────────────────────────────────────
async function start() {
  try {
    // Connect and sync database
    await sequelize.authenticate();
    console.log('✅ Database connected.');

    await sequelize.sync();
    console.log('✅ Database synchronized.');

    app.listen(PORT, () => {
      console.log(`\n🚀 LexiLearn API running on http://localhost:${PORT}`);
      console.log(`📚 Environment: ${process.env.NODE_ENV || 'development'}`);
      console.log(`💾 Database: ${process.env.DB_DIALECT || 'sqlite'}\n`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

start();
