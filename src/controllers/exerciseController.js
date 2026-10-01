const { Exercise, Skill, Attempt } = require('../models');
const AdaptiveEngine = require('../services/adaptiveEngine');
const GamificationService = require('../services/gamificationService');

/**
 * GET /api/exercises/next
 * Get next recommended exercises for the student
 */
exports.getNextExercises = async (req, res, next) => {
  try {
    const profile = req.user.profile;
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const count = parseInt(req.query.count) || 5;
    const exercises = await AdaptiveEngine.getNextExercises(profile.id, count);

    res.json({ exercises });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/exercises/:id
 * Get a specific exercise by ID
 */
exports.getExercise = async (req, res, next) => {
  try {
    const exercise = await Exercise.findByPk(req.params.id, {
      include: [{ model: Skill, as: 'skill' }],
    });

    if (!exercise || !exercise.isActive) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }

    res.json({ exercise });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/exercises/skill/:skillId
 * Get exercises for a specific skill
 */
exports.getExercisesBySkill = async (req, res, next) => {
  try {
    const { difficulty } = req.query;
    const where = { skillId: req.params.skillId, isActive: true };
    if (difficulty) where.difficulty = parseInt(difficulty);

    const exercises = await Exercise.findAll({
      where,
      include: [{ model: Skill, as: 'skill' }],
      order: [['difficulty', 'ASC']],
    });

    res.json({ exercises });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/exercises/:id/submit
 * Submit an exercise attempt
 */
exports.submitAttempt = async (req, res, next) => {
  try {
    const profile = req.user.profile;
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const exercise = await Exercise.findByPk(req.params.id, {
      include: [{ model: Skill, as: 'skill' }],
    });

    if (!exercise) {
      return res.status(404).json({ error: 'Exercise not found.' });
    }

    const { answers, timeSpent } = req.body;
    if (!answers) {
      return res.status(400).json({ error: 'Answers are required.' });
    }

    // Grade the attempt based on exercise type
    const gradeResult = gradeExercise(exercise, answers);

    // Create the attempt record
    const attempt = await Attempt.create({
      studentProfileId: profile.id,
      exerciseId: exercise.id,
      answers,
      correctCount: gradeResult.correctCount,
      totalCount: gradeResult.totalCount,
      score: gradeResult.score,
      timeSpent: timeSpent || 0,
      difficulty: exercise.difficulty,
      completed: true,
    });

    // Update skill proficiency
    await AdaptiveEngine.updateSkillProficiency(profile.id, exercise.id, gradeResult.score);

    // Calculate and award XP
    const isPerfect = gradeResult.score >= 1.0;
    const streakData = await GamificationService.updateStreak(profile.id);
    const xp = GamificationService.calculateExerciseXP(
      gradeResult.score,
      exercise.difficulty,
      isPerfect,
      streakData?.currentStreak || 0
    );

    const xpResult = await GamificationService.awardXP(profile.id, xp, 'exercise');

    // Update daily progress
    await GamificationService.updateDailyProgress(profile.id, {
      exercisesCompleted: 1,
      correctAnswers: gradeResult.correctCount,
      totalAnswers: gradeResult.totalCount,
      timeSpent: timeSpent || 0,
    });

    // Check achievements
    const newAchievements = await GamificationService.checkAchievements(profile.id);

    res.json({
      attempt: {
        id: attempt.id,
        score: gradeResult.score,
        correctCount: gradeResult.correctCount,
        totalCount: gradeResult.totalCount,
        details: gradeResult.details,
      },
      xp: xpResult,
      streak: streakData,
      newAchievements,
      isPerfect,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Grade an exercise based on its type and the student's answers
 */
function gradeExercise(exercise, answers) {
  const content = exercise.content;
  let correctCount = 0;
  let totalCount = 0;
  const details = [];

  switch (exercise.type) {
    case 'multiple_choice': {
      totalCount = 1;
      const isCorrect = answers.selected === content.correctAnswer;
      if (isCorrect) correctCount = 1;
      details.push({ question: content.question, correct: isCorrect, correctAnswer: content.correctAnswer });
      break;
    }

    case 'listen_select': {
      totalCount = 1;
      const isCorrect = answers.selected === content.correctAnswer;
      if (isCorrect) correctCount = 1;
      details.push({ correct: isCorrect, correctAnswer: content.correctAnswer });
      break;
    }

    case 'word_ordering': {
      totalCount = 1;
      const studentOrder = Array.isArray(answers.order) ? answers.order.join(' ') : '';
      const correctOrder = content.correctOrder.join(' ');
      const isCorrect = studentOrder.toLowerCase() === correctOrder.toLowerCase();
      if (isCorrect) correctCount = 1;
      details.push({ correct: isCorrect, correctOrder: content.correctOrder });
      break;
    }

    case 'fill_blank': {
      totalCount = 1;
      const isCorrect = answers.answer?.toLowerCase().trim() === content.correctAnswer.toLowerCase().trim();
      if (isCorrect) correctCount = 1;
      details.push({ correct: isCorrect, correctAnswer: content.correctAnswer });
      break;
    }

    case 'spelling': {
      totalCount = 1;
      const isCorrect = answers.spelling?.toLowerCase().trim() === content.word.toLowerCase().trim();
      if (isCorrect) correctCount = 1;
      details.push({ correct: isCorrect, correctAnswer: content.word });
      break;
    }

    case 'reading_comprehension': {
      const questions = content.questions || [];
      totalCount = questions.length;
      questions.forEach((q, i) => {
        const studentAnswer = answers.answers?.[i];
        const isCorrect = studentAnswer === q.correctAnswer;
        if (isCorrect) correctCount += 1;
        details.push({
          question: q.question,
          correct: isCorrect,
          correctAnswer: q.correctAnswer,
          studentAnswer,
        });
      });
      break;
    }

    case 'match_sounds': {
      const pairs = content.pairs || [];
      totalCount = pairs.length;
      pairs.forEach((pair, i) => {
        const studentMatch = answers.matches?.[i];
        const isCorrect = studentMatch === pair.sound;
        if (isCorrect) correctCount += 1;
        details.push({ word: pair.word, correct: isCorrect, correctMatch: pair.sound });
      });
      break;
    }

    case 'identify_incorrect': {
      totalCount = 1;
      const isCorrect = answers.selected === content.incorrectWord;
      if (isCorrect) correctCount = 1;
      details.push({ correct: isCorrect, incorrectWord: content.incorrectWord, correctWord: content.correctWord });
      break;
    }

    default:
      totalCount = 1;
      break;
  }

  const score = totalCount > 0 ? correctCount / totalCount : 0;

  return { correctCount, totalCount, score, details };
}
