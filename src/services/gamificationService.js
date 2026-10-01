const {
  StudentProfile, Achievement, StudentAchievement, DailyProgress, Attempt,
} = require('../models');
const { Op } = require('sequelize');
const AdaptiveEngine = require('./adaptiveEngine');

/**
 * Gamification Service
 * 
 * Manages XP, levels, streaks, achievements, and daily goals
 */
class GamificationService {
  /**
   * Award XP to a student and check for level-ups
   */
  static async awardXP(studentProfileId, xp, source = 'exercise') {
    const profile = await StudentProfile.findByPk(studentProfileId);
    if (!profile) return null;

    const previousLevel = profile.currentLevel;
    profile.totalXP += xp;
    profile.currentLevel = AdaptiveEngine.calculateLevel(profile.totalXP);

    await profile.save();

    // Update daily progress
    await this.updateDailyProgress(studentProfileId, { xpEarned: xp });

    const leveledUp = profile.currentLevel > previousLevel;

    return {
      xpEarned: xp,
      totalXP: profile.totalXP,
      currentLevel: profile.currentLevel,
      leveledUp,
      previousLevel,
      nextLevel: AdaptiveEngine.xpForNextLevel(profile.totalXP),
    };
  }

  /**
   * Calculate XP earned for an exercise attempt
   */
  static calculateExerciseXP(score, difficulty, isPerfect, streakBonus = 0) {
    let xp = 10; // Base XP

    // Score multiplier
    xp += Math.round(score * 10);

    // Difficulty bonus
    xp += difficulty * 2;

    // Perfect bonus
    if (isPerfect) xp += 25;

    // Streak bonus (max 50 extra XP)
    xp += Math.min(50, streakBonus * 5);

    return xp;
  }

  /**
   * Update streak tracking
   */
  static async updateStreak(studentProfileId) {
    const profile = await StudentProfile.findByPk(studentProfileId);
    if (!profile) return;

    const today = new Date().toISOString().split('T')[0];
    const lastActive = profile.lastActiveDate;

    if (lastActive === today) {
      // Already active today, no change
      return { currentStreak: profile.currentStreak, maintained: true };
    }

    const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    if (lastActive === yesterday) {
      // Consecutive day — extend streak
      profile.currentStreak += 1;
      if (profile.currentStreak > profile.longestStreak) {
        profile.longestStreak = profile.currentStreak;
      }
    } else if (lastActive !== today) {
      // Streak broken — reset to 1
      profile.currentStreak = 1;
    }

    profile.lastActiveDate = today;
    await profile.save();

    return {
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      maintained: lastActive === yesterday,
    };
  }

  /**
   * Update daily progress record
   */
  static async updateDailyProgress(studentProfileId, data) {
    const today = new Date().toISOString().split('T')[0];
    const profile = await StudentProfile.findByPk(studentProfileId);

    let [progress, created] = await DailyProgress.findOrCreate({
      where: { studentProfileId, date: today },
      defaults: { studentProfileId, date: today },
    });

    if (data.xpEarned) progress.xpEarned += data.xpEarned;
    if (data.exercisesCompleted) progress.exercisesCompleted += data.exercisesCompleted;
    if (data.correctAnswers) progress.correctAnswers += data.correctAnswers;
    if (data.totalAnswers) progress.totalAnswers += data.totalAnswers;
    if (data.timeSpent) progress.timeSpent += data.timeSpent;

    // Check if daily goal is met
    if (profile && progress.xpEarned >= profile.dailyGoalXP) {
      progress.goalMet = true;
    }

    await progress.save();
    return progress;
  }

  /**
   * Check and award achievements after an action
   */
  static async checkAchievements(studentProfileId) {
    const profile = await StudentProfile.findByPk(studentProfileId);
    if (!profile) return [];

    const allAchievements = await Achievement.findAll();
    const unlockedIds = await StudentAchievement.findAll({
      where: { studentProfileId },
      attributes: ['achievementId'],
    }).then((sa) => sa.map((a) => a.achievementId));

    const newlyUnlocked = [];

    for (const achievement of allAchievements) {
      if (unlockedIds.includes(achievement.id)) continue;

      const earned = await this.evaluateAchievement(achievement, studentProfileId, profile);
      if (earned) {
        await StudentAchievement.create({
          studentProfileId,
          achievementId: achievement.id,
        });

        // Award achievement XP
        profile.totalXP += achievement.xpReward;
        profile.currentLevel = AdaptiveEngine.calculateLevel(profile.totalXP);

        newlyUnlocked.push({
          ...achievement.toJSON(),
          xpAwarded: achievement.xpReward,
        });
      }
    }

    if (newlyUnlocked.length > 0) {
      await profile.save();
    }

    return newlyUnlocked;
  }

  /**
   * Evaluate whether a student has earned a specific achievement
   */
  static async evaluateAchievement(achievement, studentProfileId, profile) {
    const { criteria } = achievement;
    if (!criteria || !criteria.type) return false;

    switch (criteria.type) {
      case 'exercises_completed': {
        const count = await Attempt.count({
          where: { studentProfileId, completed: true },
        });
        return count >= criteria.count;
      }
      case 'perfect_score': {
        const perfects = await Attempt.count({
          where: { studentProfileId, score: { [Op.gte]: 1.0 }, completed: true },
        });
        return perfects >= (criteria.count || 1);
      }
      case 'streak': {
        return profile.currentStreak >= criteria.days;
      }
      case 'xp_total': {
        return profile.totalXP >= criteria.amount;
      }
      case 'level': {
        return profile.currentLevel >= criteria.level;
      }
      case 'daily_goals': {
        const goals = await DailyProgress.count({
          where: { studentProfileId, goalMet: true },
        });
        return goals >= criteria.count;
      }
      default:
        return false;
    }
  }

  /**
   * Get gamification summary for a student
   */
  static async getGamificationSummary(studentProfileId) {
    const profile = await StudentProfile.findByPk(studentProfileId);
    if (!profile) return null;

    const today = new Date().toISOString().split('T')[0];
    const dailyProgress = await DailyProgress.findOne({
      where: { studentProfileId, date: today },
    });

    const totalExercises = await Attempt.count({
      where: { studentProfileId, completed: true },
    });

    const achievements = await StudentAchievement.findAll({
      where: { studentProfileId },
      include: [{ model: Achievement, as: 'achievement' }],
      order: [['unlockedAt', 'DESC']],
    });

    const totalAchievements = await Achievement.count();

    // Weekly progress (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const weeklyProgress = await DailyProgress.findAll({
      where: {
        studentProfileId,
        date: { [Op.gte]: weekAgo },
      },
      order: [['date', 'ASC']],
    });

    return {
      level: profile.currentLevel,
      totalXP: profile.totalXP,
      nextLevel: AdaptiveEngine.xpForNextLevel(profile.totalXP),
      currentStreak: profile.currentStreak,
      longestStreak: profile.longestStreak,
      dailyGoalXP: profile.dailyGoalXP,
      dailyProgress: dailyProgress ? {
        xpEarned: dailyProgress.xpEarned,
        exercisesCompleted: dailyProgress.exercisesCompleted,
        goalMet: dailyProgress.goalMet,
        progress: Math.min(1, dailyProgress.xpEarned / profile.dailyGoalXP),
      } : { xpEarned: 0, exercisesCompleted: 0, goalMet: false, progress: 0 },
      totalExercisesCompleted: totalExercises,
      achievements: achievements.map((sa) => sa.achievement),
      achievementProgress: {
        unlocked: achievements.length,
        total: totalAchievements,
      },
      weeklyProgress: weeklyProgress.map((dp) => ({
        date: dp.date,
        xp: dp.xpEarned,
        exercises: dp.exercisesCompleted,
        goalMet: dp.goalMet,
      })),
    };
  }
}

module.exports = GamificationService;
