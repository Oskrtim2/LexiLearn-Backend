const {
  Attempt, Exercise, Skill, StudentSkill, StudentProfile, LearningPath,
} = require('../models');
const { Op } = require('sequelize');

/**
 * Adaptive Learning Engine
 * 
 * Analyzes student performance to dynamically adjust difficulty
 * and recommend appropriate exercises.
 */
class AdaptiveEngine {
  /**
   * XP thresholds for each level (cumulative)
   */
  static LEVEL_THRESHOLDS = [
    0, 100, 250, 500, 850, 1300, 1900, 2600, 3500, 4600,
    5900, 7400, 9200, 11300, 13800, 16800, 20300, 24400, 29200, 34800,
  ];

  /**
   * Calculate the student's level from their total XP
   */
  static calculateLevel(totalXP) {
    let level = 1;
    for (let i = 0; i < this.LEVEL_THRESHOLDS.length; i++) {
      if (totalXP >= this.LEVEL_THRESHOLDS[i]) {
        level = i + 1;
      } else {
        break;
      }
    }
    return level;
  }

  /**
   * Get XP needed for next level
   */
  static xpForNextLevel(totalXP) {
    const currentLevel = this.calculateLevel(totalXP);
    if (currentLevel >= this.LEVEL_THRESHOLDS.length) {
      return { current: totalXP, needed: totalXP + 5000, progress: 0.5 };
    }
    const currentThreshold = this.LEVEL_THRESHOLDS[currentLevel - 1];
    const nextThreshold = this.LEVEL_THRESHOLDS[currentLevel];
    const progress = (totalXP - currentThreshold) / (nextThreshold - currentThreshold);
    return { current: totalXP - currentThreshold, needed: nextThreshold - currentThreshold, progress };
  }

  /**
   * Analyze recent performance for a specific skill
   * Returns: { accuracy, avgTime, trend, recommendedDifficulty }
   */
  static async analyzeSkillPerformance(studentProfileId, skillId, windowSize = 15) {
    const recentAttempts = await Attempt.findAll({
      where: { studentProfileId },
      include: [{
        model: Exercise,
        as: 'exercise',
        where: { skillId },
        attributes: ['difficulty', 'type'],
      }],
      order: [['createdAt', 'DESC']],
      limit: windowSize,
    });

    if (recentAttempts.length === 0) {
      return { accuracy: 0, avgTime: 0, trend: 'neutral', recommendedDifficulty: 1, attempts: 0 };
    }

    // Calculate overall accuracy
    const totalCorrect = recentAttempts.reduce((sum, a) => sum + a.correctCount, 0);
    const totalQuestions = recentAttempts.reduce((sum, a) => sum + a.totalCount, 0);
    const accuracy = totalQuestions > 0 ? totalCorrect / totalQuestions : 0;

    // Average time per question (ms)
    const avgTime = recentAttempts.reduce((sum, a) => sum + a.timeSpent, 0) / recentAttempts.length;

    // Trend: compare first half vs second half accuracy
    const halfIndex = Math.floor(recentAttempts.length / 2);
    const recentHalf = recentAttempts.slice(0, halfIndex);
    const olderHalf = recentAttempts.slice(halfIndex);

    const recentAccuracy = recentHalf.length > 0
      ? recentHalf.reduce((s, a) => s + a.score, 0) / recentHalf.length
      : 0;
    const olderAccuracy = olderHalf.length > 0
      ? olderHalf.reduce((s, a) => s + a.score, 0) / olderHalf.length
      : 0;

    let trend = 'stable';
    if (recentAccuracy > olderAccuracy + 0.1) trend = 'improving';
    else if (recentAccuracy < olderAccuracy - 0.1) trend = 'declining';

    // Determine recommended difficulty
    const currentDifficulty = recentAttempts[0].difficulty || 1;
    let recommendedDifficulty = currentDifficulty;

    if (accuracy >= 0.85 && trend !== 'declining') {
      recommendedDifficulty = Math.min(10, currentDifficulty + 1);
    } else if (accuracy < 0.45) {
      recommendedDifficulty = Math.max(1, currentDifficulty - 1);
    } else if (accuracy < 0.6 && trend === 'declining') {
      recommendedDifficulty = Math.max(1, currentDifficulty - 1);
    }

    return {
      accuracy: Math.round(accuracy * 100),
      avgTime: Math.round(avgTime),
      trend,
      recommendedDifficulty,
      attempts: recentAttempts.length,
    };
  }

  /**
   * Get the next exercises for a student based on adaptive analysis
   * Prioritizes weakest skills and appropriate difficulty levels
   */
  static async getNextExercises(studentProfileId, count = 5) {
    // Get all student skills with proficiency data
    const studentSkills = await StudentSkill.findAll({
      where: { studentProfileId },
      include: [{ model: Skill, as: 'skill' }],
      order: [['proficiency', 'ASC']],
    });

    if (studentSkills.length === 0) {
      // New student: return easiest exercises across all skills
      const exercises = await Exercise.findAll({
        where: { isActive: true, difficulty: { [Op.lte]: 2 } },
        include: [{ model: Skill, as: 'skill' }],
        order: [['difficulty', 'ASC']],
        limit: count,
      });
      return exercises;
    }

    // Build weighted skill selection (weaker skills get more weight)
    const exercises = [];
    const skillWeights = studentSkills.map((ss) => ({
      skillId: ss.skillId,
      weight: Math.max(1, 100 - ss.proficiency),
      proficiency: ss.proficiency,
    }));

    const totalWeight = skillWeights.reduce((sum, sw) => sum + sw.weight, 0);

    // Select exercises proportionally to skill weakness
    for (const sw of skillWeights) {
      const proportion = sw.weight / totalWeight;
      const exerciseCount = Math.max(1, Math.round(count * proportion));

      // Get recommended difficulty for this skill
      const analysis = await this.analyzeSkillPerformance(studentProfileId, sw.skillId);

      // Find exercises at appropriate difficulty that haven't been completed recently
      const recentAttemptExerciseIds = await Attempt.findAll({
        where: { studentProfileId },
        attributes: ['exerciseId'],
        order: [['createdAt', 'DESC']],
        limit: 20,
      }).then((attempts) => attempts.map((a) => a.exerciseId));

      const skillExercises = await Exercise.findAll({
        where: {
          skillId: sw.skillId,
          isActive: true,
          difficulty: {
            [Op.between]: [
              Math.max(1, analysis.recommendedDifficulty - 1),
              Math.min(10, analysis.recommendedDifficulty + 1),
            ],
          },
          ...(recentAttemptExerciseIds.length > 0
            ? { id: { [Op.notIn]: recentAttemptExerciseIds } }
            : {}),
        },
        include: [{ model: Skill, as: 'skill' }],
        order: [['id', 'ASC']],
        limit: exerciseCount,
      });

      exercises.push(...skillExercises);
    }

    // If we don't have enough, fill with any appropriate exercises
    if (exercises.length < count) {
      const existingIds = exercises.map((e) => e.id);
      const additional = await Exercise.findAll({
        where: {
          isActive: true,
          ...(existingIds.length > 0 ? { id: { [Op.notIn]: existingIds } } : {}),
        },
        include: [{ model: Skill, as: 'skill' }],
        order: [['difficulty', 'ASC']],
        limit: count - exercises.length,
      });
      exercises.push(...additional);
    }

    return exercises.slice(0, count);
  }

  /**
   * Update student skill proficiency after an attempt
   */
  static async updateSkillProficiency(studentProfileId, exerciseId, score) {
    const exercise = await Exercise.findByPk(exerciseId);
    if (!exercise) return;

    let studentSkill = await StudentSkill.findOne({
      where: { studentProfileId, skillId: exercise.skillId },
    });

    if (!studentSkill) {
      studentSkill = await StudentSkill.create({
        studentProfileId,
        skillId: exercise.skillId,
      });
    }

    // Update running statistics
    studentSkill.totalAttempts += 1;
    studentSkill.correctAttempts += Math.round(score);
    studentSkill.exercisesCompleted += 1;
    studentSkill.correctRate = studentSkill.totalAttempts > 0
      ? (studentSkill.correctAttempts / studentSkill.totalAttempts) * 100
      : 0;

    // Calculate new proficiency using exponential moving average
    const alpha = 0.3; // Learning rate — higher = more weight on recent performance
    const performanceScore = score * 100;
    studentSkill.proficiency = alpha * performanceScore + (1 - alpha) * studentSkill.proficiency;

    // Level up skill if proficiency is high enough
    if (studentSkill.proficiency >= 80 && studentSkill.level < 10) {
      const exercisesNeeded = studentSkill.level * 5;
      if (studentSkill.exercisesCompleted >= exercisesNeeded) {
        studentSkill.level += 1;
      }
    }

    await studentSkill.save();
    return studentSkill;
  }

  /**
   * Generate a learning path for a student based on assessment results
   */
  static async generateLearningPath(studentProfileId, assessmentResults) {
    const skills = await Skill.findAll({ order: [['displayOrder', 'ASC']] });

    for (const skill of skills) {
      const skillResult = assessmentResults[skill.slug] || { score: 50 };
      const startDifficulty = skillResult.score >= 70 ? 3 : skillResult.score >= 40 ? 2 : 1;

      // Find exercises for this skill at appropriate difficulty
      const exercises = await Exercise.findAll({
        where: {
          skillId: skill.id,
          isActive: true,
          difficulty: { [Op.lte]: startDifficulty + 2 },
        },
        order: [['difficulty', 'ASC']],
        limit: 10,
      });

      if (exercises.length > 0) {
        await LearningPath.create({
          studentProfileId,
          skillId: skill.id,
          exerciseIds: exercises.map((e) => e.id),
          currentIndex: 0,
          status: 'active',
        });
      }

      // Initialize student skill with assessment proficiency
      await StudentSkill.findOrCreate({
        where: { studentProfileId, skillId: skill.id },
        defaults: {
          proficiency: skillResult.score || 0,
          level: startDifficulty,
        },
      });
    }
  }
}

module.exports = AdaptiveEngine;
