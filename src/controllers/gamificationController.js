const GamificationService = require('../services/gamificationService');
const { Achievement, StudentAchievement } = require('../models');

/**
 * GET /api/gamification/summary
 */
exports.getSummary = async (req, res, next) => {
  try {
    const profile = req.user.profile;
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const summary = await GamificationService.getGamificationSummary(profile.id);
    res.json(summary);
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/gamification/achievements
 */
exports.getAchievements = async (req, res, next) => {
  try {
    const profile = req.user.profile;
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const allAchievements = await Achievement.findAll({ order: [['rarity', 'ASC']] });
    const unlockedIds = await StudentAchievement.findAll({
      where: { studentProfileId: profile.id },
      attributes: ['achievementId', 'unlockedAt'],
    });

    const unlockedMap = {};
    unlockedIds.forEach((sa) => {
      unlockedMap[sa.achievementId] = sa.unlockedAt;
    });

    const achievements = allAchievements.map((a) => ({
      ...a.toJSON(),
      unlocked: !!unlockedMap[a.id],
      unlockedAt: unlockedMap[a.id] || null,
    }));

    res.json({ achievements });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/gamification/daily-goal
 */
exports.updateDailyGoal = async (req, res, next) => {
  try {
    const profile = req.user.profile;
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const { dailyGoalXP } = req.body;
    if (!dailyGoalXP || dailyGoalXP < 10 || dailyGoalXP > 500) {
      return res.status(400).json({ error: 'Daily goal must be between 10 and 500 XP.' });
    }

    profile.dailyGoalXP = dailyGoalXP;
    await profile.save();

    res.json({ message: 'Daily goal updated.', dailyGoalXP });
  } catch (error) {
    next(error);
  }
};
