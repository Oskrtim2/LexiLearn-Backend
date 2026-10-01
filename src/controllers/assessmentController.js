const {
  Assessment, AssessmentResponse, Skill, StudentProfile, StudentSkill,
} = require('../models');
const AdaptiveEngine = require('../services/adaptiveEngine');
const GamificationService = require('../services/gamificationService');

/**
 * Assessment questions organized by skill
 * These evaluate reading comprehension, word recognition, spelling,
 * phonological awareness, working memory, and reading fluency
 */
const ASSESSMENT_QUESTIONS = {
  'reading-comprehension': [
    {
      prompt: 'Read the sentence: "The cat sat on the warm windowsill and watched the birds outside." Where did the cat sit?',
      options: ['On the floor', 'On the windowsill', 'Outside', 'On the bed'],
      correctAnswer: 'On the windowsill',
    },
    {
      prompt: 'Read: "Sara was happy because she found her lost puppy in the garden." Why was Sara happy?',
      options: ['She went to the garden', 'She found her puppy', 'She lost her puppy', 'She was playing'],
      correctAnswer: 'She found her puppy',
    },
    {
      prompt: 'Read: "It was raining, so Tom took his umbrella before going outside." What did Tom take with him?',
      options: ['A coat', 'His bag', 'An umbrella', 'A hat'],
      correctAnswer: 'An umbrella',
    },
  ],
  'word-recognition': [
    {
      prompt: 'Which of these is a real word?',
      options: ['Brike', 'Bridge', 'Brije', 'Brydge'],
      correctAnswer: 'Bridge',
    },
    {
      prompt: 'Which word means "a place where you sleep"?',
      options: ['Bed', 'Bad', 'Bid', 'Bud'],
      correctAnswer: 'Bed',
    },
    {
      prompt: 'Choose the correctly spelled word:',
      options: ['Elefant', 'Elephant', 'Elaphant', 'Elephent'],
      correctAnswer: 'Elephant',
    },
  ],
  'spelling': [
    {
      prompt: 'Which is spelled correctly?',
      options: ['Becuase', 'Because', 'Becouse', 'Becase'],
      correctAnswer: 'Because',
    },
    {
      prompt: 'Choose the correct spelling:',
      options: ['Freind', 'Frend', 'Friend', 'Frind'],
      correctAnswer: 'Friend',
    },
    {
      prompt: 'Which word is spelled correctly?',
      options: ['Beautful', 'Beautiful', 'Beatiful', 'Beutiful'],
      correctAnswer: 'Beautiful',
    },
  ],
  'phonological-awareness': [
    {
      prompt: 'Which word rhymes with "cat"?',
      options: ['Dog', 'Bat', 'Cup', 'Run'],
      correctAnswer: 'Bat',
    },
    {
      prompt: 'Which word starts with the same sound as "sun"?',
      options: ['Chair', 'Sit', 'Moon', 'Ball'],
      correctAnswer: 'Sit',
    },
    {
      prompt: 'How many syllables are in the word "butterfly"?',
      options: ['1', '2', '3', '4'],
      correctAnswer: '3',
    },
  ],
  'working-memory': [
    {
      prompt: 'If you rearrange the letters "A-C-T", what word do you get?',
      options: ['Cat', 'Act', 'Tac', 'Both Cat and Act'],
      correctAnswer: 'Both Cat and Act',
    },
    {
      prompt: 'Which sequence follows the pattern: 2, 4, 6, __?',
      options: ['7', '8', '9', '10'],
      correctAnswer: '8',
    },
    {
      prompt: 'Remember: "apple, book, cat." Which was the second item?',
      options: ['Apple', 'Book', 'Cat', 'Dog'],
      correctAnswer: 'Book',
    },
  ],
  'reading-fluency': [
    {
      prompt: 'Read: "The big brown dog jumped over the lazy fox." What color was the dog?',
      options: ['Black', 'White', 'Brown', 'Gray'],
      correctAnswer: 'Brown',
    },
    {
      prompt: 'Complete the sentence: "The sun ___ in the east."',
      options: ['sets', 'rises', 'falls', 'hides'],
      correctAnswer: 'rises',
    },
    {
      prompt: 'What is the opposite of "hot"?',
      options: ['Warm', 'Cold', 'Cool', 'Mild'],
      correctAnswer: 'Cold',
    },
  ],
};

/**
 * POST /api/assessment/start
 * Start a new initial assessment
 */
exports.startAssessment = async (req, res, next) => {
  try {
    const profile = req.user.profile;
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    // Check for existing incomplete assessment
    let assessment = await Assessment.findOne({
      where: {
        studentProfileId: profile.id,
        type: 'initial',
        status: 'in_progress',
      },
    });

    if (!assessment) {
      assessment = await Assessment.create({
        studentProfileId: profile.id,
        type: 'initial',
        status: 'in_progress',
        startedAt: new Date(),
      });
    }

    // Build questions list
    const skills = await Skill.findAll({ order: [['displayOrder', 'ASC']] });
    const questions = [];

    for (const skill of skills) {
      const skillQuestions = ASSESSMENT_QUESTIONS[skill.slug] || [];
      skillQuestions.forEach((q, index) => {
        questions.push({
          skillId: skill.id,
          skillName: skill.name,
          skillSlug: skill.slug,
          skillIcon: skill.icon,
          skillColor: skill.color,
          questionIndex: index,
          ...q,
        });
      });
    }

    res.json({
      assessment: {
        id: assessment.id,
        status: assessment.status,
      },
      questions,
      totalQuestions: questions.length,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/assessment/:id/submit
 * Submit completed assessment answers
 */
exports.submitAssessment = async (req, res, next) => {
  try {
    const profile = req.user.profile;
    const assessmentId = req.params.id;
    const { responses } = req.body;

    if (!responses || !Array.isArray(responses)) {
      return res.status(400).json({ error: 'Responses array is required.' });
    }

    const assessment = await Assessment.findOne({
      where: { id: assessmentId, studentProfileId: profile.id },
    });

    if (!assessment) {
      return res.status(404).json({ error: 'Assessment not found.' });
    }

    // Save individual responses
    const results = {};
    let totalCorrect = 0;
    let totalQuestions = 0;

    for (const response of responses) {
      const { skillId, skillSlug, questionIndex, answer, correctAnswer, timeSpent } = response;
      const isCorrect = answer === correctAnswer;

      await AssessmentResponse.create({
        assessmentId: assessment.id,
        skillId,
        questionIndex,
        prompt: response.prompt || '',
        answer,
        correctAnswer,
        isCorrect,
        timeSpent: timeSpent || 0,
      });

      if (!results[skillSlug]) {
        results[skillSlug] = { correct: 0, total: 0, totalTime: 0 };
      }
      results[skillSlug].total += 1;
      results[skillSlug].totalTime += (timeSpent || 0);
      if (isCorrect) {
        results[skillSlug].correct += 1;
        totalCorrect += 1;
      }
      totalQuestions += 1;
    }

    // Calculate scores per skill
    const skillScores = {};
    for (const [slug, data] of Object.entries(results)) {
      skillScores[slug] = {
        score: Math.round((data.correct / data.total) * 100),
        correct: data.correct,
        total: data.total,
        avgTime: Math.round(data.totalTime / data.total),
      };
    }

    // Update assessment
    assessment.status = 'completed';
    assessment.results = skillScores;
    assessment.totalScore = Math.round((totalCorrect / totalQuestions) * 100);
    assessment.completedAt = new Date();
    await assessment.save();

    // Mark profile as assessment completed
    profile.assessmentCompleted = true;
    await profile.save();

    // Generate learning path based on results
    await AdaptiveEngine.generateLearningPath(profile.id, skillScores);

    // Award XP for completing assessment
    const xpResult = await GamificationService.awardXP(profile.id, 100, 'assessment');
    const newAchievements = await GamificationService.checkAchievements(profile.id);

    res.json({
      message: 'Assessment completed!',
      results: {
        overallScore: assessment.totalScore,
        skillScores,
        totalCorrect,
        totalQuestions,
      },
      xp: xpResult,
      newAchievements,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/assessment/results
 * Get assessment results for the current student
 */
exports.getResults = async (req, res, next) => {
  try {
    const profile = req.user.profile;
    if (!profile) {
      return res.status(404).json({ error: 'Student profile not found.' });
    }

    const assessment = await Assessment.findOne({
      where: { studentProfileId: profile.id, type: 'initial', status: 'completed' },
      include: [{
        model: AssessmentResponse,
        as: 'responses',
        include: [{ model: Skill, as: 'skill' }],
      }],
      order: [['completedAt', 'DESC']],
    });

    if (!assessment) {
      return res.status(404).json({ error: 'No completed assessment found.' });
    }

    res.json({ assessment });
  } catch (error) {
    next(error);
  }
};
