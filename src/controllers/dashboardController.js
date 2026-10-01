const {
  StudentProfile, StudentSkill, Skill, Attempt, Exercise,
  DailyProgress, StudentAchievement, Achievement, LearningPath, Assessment,
} = require('../models');
const { Op } = require('sequelize');
const GamificationService = require('../services/gamificationService');
const AdaptiveEngine = require('../services/adaptiveEngine');

/**
 * GET /api/dashboard
 * Get the complete student dashboard data
 */
exports.getDashboard = async (req, res, next) => {
  try {
    const profile = req.user.profile;
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    // Get gamification summary
    const gamification = await GamificationService.getGamificationSummary(profile.id);

    // Get skill overview
    const skills = await StudentSkill.findAll({
      where: { studentProfileId: profile.id },
      include: [{ model: Skill, as: 'skill' }],
      order: [[{ model: Skill, as: 'skill' }, 'displayOrder', 'ASC']],
    });

    // Get recent activity (last 5 exercises)
    const recentActivity = await Attempt.findAll({
      where: { studentProfileId: profile.id, completed: true },
      include: [{
        model: Exercise,
        as: 'exercise',
        include: [{ model: Skill, as: 'skill' }],
      }],
      order: [['createdAt', 'DESC']],
      limit: 5,
    });

    // Identify weak areas (skills with proficiency < 40)
    const weakAreas = skills
      .filter((s) => s.proficiency < 40)
      .map((s) => ({
        skill: s.skill,
        proficiency: s.proficiency,
        suggestion: `Practice more ${s.skill.name.toLowerCase()} exercises to improve!`,
      }));

    // Get recommended next exercises
    const recommendedExercises = await AdaptiveEngine.getNextExercises(profile.id, 3);

    // Assessment status
    const assessment = await Assessment.findOne({
      where: { studentProfileId: profile.id, type: 'initial' },
      order: [['createdAt', 'DESC']],
    });

    res.json({
      student: {
        firstName: req.user.firstName,
        lastName: req.user.lastName,
        avatar: req.user.avatar,
      },
      gamification,
      skills: skills.map((s) => ({
        id: s.id,
        name: s.skill.name,
        slug: s.skill.slug,
        icon: s.skill.icon,
        color: s.skill.color,
        level: s.level,
        proficiency: Math.round(s.proficiency),
        exercisesCompleted: s.exercisesCompleted,
        correctRate: Math.round(s.correctRate),
      })),
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        exerciseTitle: a.exercise.title,
        exerciseType: a.exercise.type,
        skillName: a.exercise.skill.name,
        skillIcon: a.exercise.skill.icon,
        score: Math.round(a.score * 100),
        xpEarned: a.xpEarned,
        timeSpent: a.timeSpent,
        completedAt: a.createdAt,
      })),
      weakAreas,
      recommendedExercises: recommendedExercises.map((e) => ({
        id: e.id,
        title: e.title,
        type: e.type,
        difficulty: e.difficulty,
        skillName: e.skill?.name,
        skillIcon: e.skill?.icon,
        skillColor: e.skill?.color,
        points: e.points,
      })),
      assessmentCompleted: profile.assessmentCompleted,
      assessmentScore: assessment?.totalScore || null,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/teacher
 * Teacher dashboard: view all students' progress
 */
exports.getTeacherDashboard = async (req, res, next) => {
  try {
    const students = await StudentProfile.findAll({
      include: [
        {
          model: require('../models').User,
          as: 'user',
          attributes: ['id', 'firstName', 'lastName', 'email'],
        },
        {
          model: StudentSkill,
          as: 'skills',
          include: [{ model: Skill, as: 'skill' }],
        },
      ],
      order: [['createdAt', 'DESC']],
    });

    const studentSummaries = await Promise.all(
      students.map(async (profile) => {
        const totalAttempts = await Attempt.count({
          where: { studentProfileId: profile.id, completed: true },
        });

        const avgScore = await Attempt.findOne({
          where: { studentProfileId: profile.id, completed: true },
          attributes: [
            [require('sequelize').fn('AVG', require('sequelize').col('score')), 'avgScore'],
          ],
          raw: true,
        });

        const weakSkills = profile.skills
          .filter((s) => s.proficiency < 40)
          .map((s) => s.skill.name);

        return {
          id: profile.id,
          userId: profile.userId,
          student: profile.user,
          level: profile.currentLevel,
          totalXP: profile.totalXP,
          currentStreak: profile.currentStreak,
          assessmentCompleted: profile.assessmentCompleted,
          totalExercises: totalAttempts,
          averageScore: avgScore?.avgScore ? Math.round(avgScore.avgScore * 100) : 0,
          lastActive: profile.lastActiveDate,
          weakSkills,
          skills: profile.skills.map((s) => ({
            name: s.skill.name,
            proficiency: Math.round(s.proficiency),
            icon: s.skill.icon,
          })),
        };
      })
    );

    res.json({ students: studentSummaries });
  } catch (error) {
    next(error);
  }
};
