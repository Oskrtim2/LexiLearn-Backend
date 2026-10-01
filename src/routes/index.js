const express = require('express');
const router = express.Router();
const { authenticate, authorize } = require('../middleware/auth');

// Controllers
const authController = require('../controllers/authController');
const studentController = require('../controllers/studentController');
const exerciseController = require('../controllers/exerciseController');
const assessmentController = require('../controllers/assessmentController');
const dashboardController = require('../controllers/dashboardController');
const gamificationController = require('../controllers/gamificationController');

// ─── Auth Routes ───────────────────────────────────────────────
router.post('/auth/register', authController.register);
router.post('/auth/login', authController.login);
router.get('/auth/me', authenticate, authController.getMe);
router.post('/auth/refresh', authController.refreshToken);

// ─── Student Routes ────────────────────────────────────────────
router.get('/student/profile', authenticate, authorize('student'), studentController.getProfile);
router.put('/student/profile', authenticate, authorize('student'), studentController.updateProfile);
router.get('/student/skills', authenticate, authorize('student'), studentController.getSkills);
router.get('/student/history', authenticate, authorize('student'), studentController.getHistory);
router.get('/student/weekly-progress', authenticate, authorize('student'), studentController.getWeeklyProgress);

// ─── Exercise Routes ───────────────────────────────────────────
router.get('/exercises/next', authenticate, authorize('student'), exerciseController.getNextExercises);
router.get('/exercises/skill/:skillId', authenticate, exerciseController.getExercisesBySkill);
router.get('/exercises/:id', authenticate, exerciseController.getExercise);
router.post('/exercises/:id/submit', authenticate, authorize('student'), exerciseController.submitAttempt);

// ─── Assessment Routes ─────────────────────────────────────────
router.post('/assessment/start', authenticate, authorize('student'), assessmentController.startAssessment);
router.post('/assessment/:id/submit', authenticate, authorize('student'), assessmentController.submitAssessment);
router.get('/assessment/results', authenticate, authorize('student'), assessmentController.getResults);

// ─── Dashboard Routes ──────────────────────────────────────────
router.get('/dashboard', authenticate, authorize('student'), dashboardController.getDashboard);
router.get('/dashboard/teacher', authenticate, authorize('teacher', 'admin'), dashboardController.getTeacherDashboard);

// ─── Gamification Routes ───────────────────────────────────────
router.get('/gamification/summary', authenticate, authorize('student'), gamificationController.getSummary);
router.get('/gamification/achievements', authenticate, authorize('student'), gamificationController.getAchievements);
router.put('/gamification/daily-goal', authenticate, authorize('student'), gamificationController.updateDailyGoal);

// ─── Health Check ──────────────────────────────────────────────
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString(), version: '1.0.0' });
});

module.exports = router;
