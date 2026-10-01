const { User, StudentProfile, StudentSkill, Skill, Attempt, DailyProgress } = require('../models');
const { Op } = require('sequelize');

/**
 * GET /api/student/profile
 */
exports.getProfile = async (req, res, next) => {
  try {
    const profile = await StudentProfile.findOne({
      where: { userId: req.user.id },
      include: [
        {
          model: StudentSkill,
          as: 'skills',
          include: [{ model: Skill, as: 'skill' }],
        },
      ],
    });

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    res.json({ profile });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/student/profile
 */
exports.updateProfile = async (req, res, next) => {
  try {
    const { firstName, lastName, dateOfBirth, grade, dailyGoalXP, preferences } = req.body;
    const profile = await StudentProfile.findOne({ where: { userId: req.user.id } });

    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    // Update user name
    if (firstName || lastName) {
      await User.update(
        { firstName: firstName || req.user.firstName, lastName: lastName || req.user.lastName },
        { where: { id: req.user.id } }
      );
    }

    // Update profile fields
    if (dateOfBirth) profile.dateOfBirth = dateOfBirth;
    if (grade) profile.grade = grade;
    if (dailyGoalXP) profile.dailyGoalXP = dailyGoalXP;
    if (preferences) profile.preferences = { ...profile.preferences, ...preferences };

    await profile.save();

    res.json({ message: 'Profile updated successfully.', profile });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/skills
 */
exports.getSkills = async (req, res, next) => {
  try {
    const profile = req.user.profile;
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const skills = await StudentSkill.findAll({
      where: { studentProfileId: profile.id },
      include: [{ model: Skill, as: 'skill' }],
      order: [[{ model: Skill, as: 'skill' }, 'displayOrder', 'ASC']],
    });

    res.json({ skills });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/history
 */
exports.getHistory = async (req, res, next) => {
  try {
    const profile = req.user.profile;
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const { limit = 20, offset = 0 } = req.query;

    const attempts = await Attempt.findAndCountAll({
      where: { studentProfileId: profile.id, completed: true },
      include: [{
        model: require('../models').Exercise,
        as: 'exercise',
        include: [{ model: Skill, as: 'skill' }],
      }],
      order: [['createdAt', 'DESC']],
      limit: parseInt(limit),
      offset: parseInt(offset),
    });

    res.json({
      history: attempts.rows,
      total: attempts.count,
      hasMore: parseInt(offset) + parseInt(limit) < attempts.count,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/student/weekly-progress
 */
exports.getWeeklyProgress = async (req, res, next) => {
  try {
    const profile = req.user.profile;
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const progress = await DailyProgress.findAll({
      where: {
        studentProfileId: profile.id,
        date: { [Op.gte]: weekAgo },
      },
      order: [['date', 'ASC']],
    });

    res.json({ weeklyProgress: progress });
  } catch (error) {
    next(error);
  }
};
