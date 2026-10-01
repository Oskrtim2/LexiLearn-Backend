/**
 * Seed data for LexiLearn
 * Run with: npm run seed
 */
const { sequelize, Skill, Exercise, Achievement } = require('../models');

const skills = [
  {
    name: 'Reading Comprehension',
    slug: 'reading-comprehension',
    description: 'Understanding and interpreting written text',
    category: 'reading',
    icon: '📖',
    color: '#7C3AED',
    displayOrder: 1,
  },
  {
    name: 'Word Recognition',
    slug: 'word-recognition',
    description: 'Identifying and recognizing words quickly',
    category: 'reading',
    icon: '👁️',
    color: '#2563EB',
    displayOrder: 2,
  },
  {
    name: 'Spelling',
    slug: 'spelling',
    description: 'Writing words with correct letter patterns',
    category: 'writing',
    icon: '✏️',
    color: '#059669',
    displayOrder: 3,
  },
  {
    name: 'Phonological Awareness',
    slug: 'phonological-awareness',
    description: 'Understanding sounds in spoken language',
    category: 'phonology',
    icon: '🔊',
    color: '#D97706',
    displayOrder: 4,
  },
  {
    name: 'Working Memory',
    slug: 'working-memory',
    description: 'Holding and manipulating information',
    category: 'cognitive',
    icon: '🧠',
    color: '#DC2626',
    displayOrder: 5,
  },
  {
    name: 'Reading Fluency',
    slug: 'reading-fluency',
    description: 'Reading smoothly with speed and accuracy',
    category: 'reading',
    icon: '⚡',
    color: '#7C3AED',
    displayOrder: 6,
  },
];

const exercises = [
  // ─── Reading Comprehension ─────────────────────────────────
  {
    skillSlug: 'reading-comprehension',
    type: 'reading_comprehension',
    difficulty: 1,
    title: 'The Friendly Dog',
    instructions: 'Read the passage and answer the questions.',
    content: {
      passage: 'Max is a friendly golden dog. He loves to play in the park every morning. His favorite game is catching the ball. After playing, Max drinks water and rests under the big tree.',
      questions: [
        { question: 'What kind of animal is Max?', options: ['A cat', 'A dog', 'A bird', 'A rabbit'], correctAnswer: 'A dog' },
        { question: 'Where does Max play?', options: ['At home', 'In the park', 'At school', 'In the pool'], correctAnswer: 'In the park' },
        { question: 'What is Max\'s favorite game?', options: ['Running', 'Catching the ball', 'Swimming', 'Sleeping'], correctAnswer: 'Catching the ball' },
      ],
    },
    points: 30,
    estimatedTime: 120,
  },
  {
    skillSlug: 'reading-comprehension',
    type: 'reading_comprehension',
    difficulty: 2,
    title: 'A Rainy Day',
    instructions: 'Read the story and answer the questions.',
    content: {
      passage: 'It was a rainy Saturday morning. Emma looked out the window and saw puddles forming on the street. She put on her yellow raincoat and red boots. Then she went outside to jump in the puddles. Her mom watched from the door and smiled.',
      questions: [
        { question: 'What day was it?', options: ['Monday', 'Saturday', 'Sunday', 'Friday'], correctAnswer: 'Saturday' },
        { question: 'What color was Emma\'s raincoat?', options: ['Red', 'Blue', 'Yellow', 'Green'], correctAnswer: 'Yellow' },
        { question: 'What did Emma do outside?', options: ['Rode a bike', 'Jumped in puddles', 'Played with a dog', 'Read a book'], correctAnswer: 'Jumped in puddles' },
      ],
    },
    points: 30,
    estimatedTime: 120,
  },
  {
    skillSlug: 'reading-comprehension',
    type: 'multiple_choice',
    difficulty: 3,
    title: 'Understanding Context',
    instructions: 'Read the sentence and choose what it means.',
    content: {
      question: '"The library was so quiet you could hear a pin drop." What does this sentence mean?',
      options: ['Someone dropped a pin', 'The library was extremely quiet', 'The library was noisy', 'Pins were falling on the floor'],
      correctAnswer: 'The library was extremely quiet',
    },
    points: 15,
    estimatedTime: 45,
  },

  // ─── Word Recognition ─────────────────────────────────────
  {
    skillSlug: 'word-recognition',
    type: 'multiple_choice',
    difficulty: 1,
    title: 'Find the Real Word',
    instructions: 'Choose the correctly spelled real word.',
    content: {
      question: 'Which of these is a real word?',
      options: ['Hause', 'House', 'Howse', 'Hous'],
      correctAnswer: 'House',
    },
    points: 10,
    estimatedTime: 30,
  },
  {
    skillSlug: 'word-recognition',
    type: 'multiple_choice',
    difficulty: 1,
    title: 'Match the Meaning',
    instructions: 'Choose the word that matches the description.',
    content: {
      question: 'A round fruit that is usually red or green:',
      options: ['Banana', 'Apple', 'Grape', 'Orange'],
      correctAnswer: 'Apple',
    },
    points: 10,
    estimatedTime: 30,
  },
  {
    skillSlug: 'word-recognition',
    type: 'identify_incorrect',
    difficulty: 2,
    title: 'Spot the Mistake',
    instructions: 'Find the word that is spelled incorrectly in the sentence.',
    content: {
      sentence: 'The buterfly flew over the garden.',
      incorrectWord: 'buterfly',
      correctWord: 'butterfly',
      words: ['The', 'buterfly', 'flew', 'over', 'the', 'garden'],
    },
    points: 15,
    estimatedTime: 45,
  },
  {
    skillSlug: 'word-recognition',
    type: 'identify_incorrect',
    difficulty: 2,
    title: 'Find the Error',
    instructions: 'Tap the word that is not spelled correctly.',
    content: {
      sentence: 'She went to the libary to read books.',
      incorrectWord: 'libary',
      correctWord: 'library',
      words: ['She', 'went', 'to', 'the', 'libary', 'to', 'read', 'books'],
    },
    points: 15,
    estimatedTime: 45,
  },

  // ─── Spelling ─────────────────────────────────────────────
  {
    skillSlug: 'spelling',
    type: 'spelling',
    difficulty: 1,
    title: 'Spell: School',
    instructions: 'Type the correct spelling of the word.',
    content: {
      word: 'school',
      hint: 'A place where students learn',
      scrambled: 'ohscol',
    },
    points: 15,
    estimatedTime: 45,
  },
  {
    skillSlug: 'spelling',
    type: 'spelling',
    difficulty: 1,
    title: 'Spell: Happy',
    instructions: 'Type the correct spelling of the word.',
    content: {
      word: 'happy',
      hint: 'A feeling when you are glad',
      scrambled: 'pahyp',
    },
    points: 15,
    estimatedTime: 45,
  },
  {
    skillSlug: 'spelling',
    type: 'fill_blank',
    difficulty: 2,
    title: 'Complete the Word',
    instructions: 'Fill in the missing letters.',
    content: {
      sentence: 'The ___ is very bright today.',
      options: ['sun', 'son', 'sin', 'san'],
      correctAnswer: 'sun',
    },
    points: 10,
    estimatedTime: 30,
  },
  {
    skillSlug: 'spelling',
    type: 'multiple_choice',
    difficulty: 2,
    title: 'Correct Spelling',
    instructions: 'Choose the correctly spelled word.',
    content: {
      question: 'Which is spelled correctly?',
      options: ['Recieve', 'Receive', 'Receeve', 'Receve'],
      correctAnswer: 'Receive',
    },
    points: 10,
    estimatedTime: 30,
  },

  // ─── Phonological Awareness ───────────────────────────────
  {
    skillSlug: 'phonological-awareness',
    type: 'multiple_choice',
    difficulty: 1,
    title: 'Rhyming Words',
    instructions: 'Choose the word that rhymes.',
    content: {
      question: 'Which word rhymes with "cake"?',
      options: ['Cook', 'Lake', 'Cup', 'Car'],
      correctAnswer: 'Lake',
    },
    points: 10,
    estimatedTime: 30,
  },
  {
    skillSlug: 'phonological-awareness',
    type: 'multiple_choice',
    difficulty: 1,
    title: 'Same Starting Sound',
    instructions: 'Find the word that starts with the same sound.',
    content: {
      question: 'Which word starts with the same sound as "fish"?',
      options: ['Phone', 'Goat', 'Ship', 'Ball'],
      correctAnswer: 'Phone',
    },
    points: 10,
    estimatedTime: 30,
  },
  {
    skillSlug: 'phonological-awareness',
    type: 'multiple_choice',
    difficulty: 2,
    title: 'Syllable Count',
    instructions: 'Count the syllables in the word.',
    content: {
      question: 'How many syllables are in "elephant"?',
      options: ['1', '2', '3', '4'],
      correctAnswer: '3',
    },
    points: 10,
    estimatedTime: 30,
  },
  {
    skillSlug: 'phonological-awareness',
    type: 'match_sounds',
    difficulty: 3,
    title: 'Match Sounds',
    instructions: 'Match each word with its beginning sound.',
    content: {
      pairs: [
        { word: 'cat', sound: '/k/' },
        { word: 'ship', sound: '/sh/' },
        { word: 'thin', sound: '/th/' },
      ],
    },
    points: 20,
    estimatedTime: 60,
  },

  // ─── Working Memory ───────────────────────────────────────
  {
    skillSlug: 'working-memory',
    type: 'word_ordering',
    difficulty: 1,
    title: 'Build a Sentence',
    instructions: 'Put the words in the correct order to make a sentence.',
    content: {
      words: ['cat', 'the', 'sat', 'mat', 'on', 'the'],
      correctOrder: ['the', 'cat', 'sat', 'on', 'the', 'mat'],
    },
    points: 15,
    estimatedTime: 60,
  },
  {
    skillSlug: 'working-memory',
    type: 'word_ordering',
    difficulty: 2,
    title: 'Order the Words',
    instructions: 'Arrange these words to form a correct sentence.',
    content: {
      words: ['went', 'she', 'the', 'to', 'store'],
      correctOrder: ['she', 'went', 'to', 'the', 'store'],
    },
    points: 15,
    estimatedTime: 60,
  },
  {
    skillSlug: 'working-memory',
    type: 'multiple_choice',
    difficulty: 2,
    title: 'Remember the Sequence',
    instructions: 'Try to remember the items and answer.',
    content: {
      question: 'Remember these words: "dog, tree, rain, book." What was the third word?',
      options: ['Dog', 'Tree', 'Rain', 'Book'],
      correctAnswer: 'Rain',
    },
    points: 15,
    estimatedTime: 45,
  },

  // ─── Reading Fluency ──────────────────────────────────────
  {
    skillSlug: 'reading-fluency',
    type: 'fill_blank',
    difficulty: 1,
    title: 'Complete the Sentence',
    instructions: 'Choose the word that best completes the sentence.',
    content: {
      sentence: 'The bird can ___ in the sky.',
      options: ['fly', 'swim', 'dig', 'drive'],
      correctAnswer: 'fly',
    },
    points: 10,
    estimatedTime: 30,
  },
  {
    skillSlug: 'reading-fluency',
    type: 'fill_blank',
    difficulty: 1,
    title: 'Pick the Right Word',
    instructions: 'Select the word that fits.',
    content: {
      sentence: 'We use an ___ when it rains.',
      options: ['umbrella', 'airplane', 'elephant', 'unicorn'],
      correctAnswer: 'umbrella',
    },
    points: 10,
    estimatedTime: 30,
  },
  {
    skillSlug: 'reading-fluency',
    type: 'multiple_choice',
    difficulty: 2,
    title: 'What Happens Next?',
    instructions: 'Read and predict what happens.',
    content: {
      question: 'Tom was very thirsty after running. He will probably:',
      options: ['Go to sleep', 'Drink water', 'Read a book', 'Watch TV'],
      correctAnswer: 'Drink water',
    },
    points: 10,
    estimatedTime: 30,
  },
];

const achievements = [
  {
    name: 'First Steps',
    description: 'Complete your first exercise',
    icon: '🎯',
    category: 'milestone',
    criteria: { type: 'exercises_completed', count: 1 },
    xpReward: 50,
    rarity: 'common',
  },
  {
    name: 'Getting Started',
    description: 'Complete 5 exercises',
    icon: '🚀',
    category: 'milestone',
    criteria: { type: 'exercises_completed', count: 5 },
    xpReward: 100,
    rarity: 'common',
  },
  {
    name: 'Practice Makes Perfect',
    description: 'Complete 25 exercises',
    icon: '💪',
    category: 'milestone',
    criteria: { type: 'exercises_completed', count: 25 },
    xpReward: 200,
    rarity: 'rare',
  },
  {
    name: 'Exercise Champion',
    description: 'Complete 100 exercises',
    icon: '🏅',
    category: 'milestone',
    criteria: { type: 'exercises_completed', count: 100 },
    xpReward: 500,
    rarity: 'epic',
  },
  {
    name: 'Perfect Score',
    description: 'Get 100% on an exercise',
    icon: '⭐',
    category: 'performance',
    criteria: { type: 'perfect_score', count: 1 },
    xpReward: 75,
    rarity: 'common',
  },
  {
    name: 'Perfectionist',
    description: 'Get 10 perfect scores',
    icon: '🌟',
    category: 'performance',
    criteria: { type: 'perfect_score', count: 10 },
    xpReward: 250,
    rarity: 'rare',
  },
  {
    name: 'On Fire',
    description: 'Maintain a 3-day learning streak',
    icon: '🔥',
    category: 'streak',
    criteria: { type: 'streak', days: 3 },
    xpReward: 100,
    rarity: 'common',
  },
  {
    name: 'Week Warrior',
    description: 'Maintain a 7-day learning streak',
    icon: '⚔️',
    category: 'streak',
    criteria: { type: 'streak', days: 7 },
    xpReward: 300,
    rarity: 'rare',
  },
  {
    name: 'Unstoppable',
    description: 'Maintain a 30-day learning streak',
    icon: '👑',
    category: 'streak',
    criteria: { type: 'streak', days: 30 },
    xpReward: 1000,
    rarity: 'legendary',
  },
  {
    name: 'XP Hunter',
    description: 'Earn 500 total XP',
    icon: '💎',
    category: 'xp',
    criteria: { type: 'xp_total', amount: 500 },
    xpReward: 100,
    rarity: 'common',
  },
  {
    name: 'XP Master',
    description: 'Earn 5000 total XP',
    icon: '💫',
    category: 'xp',
    criteria: { type: 'xp_total', amount: 5000 },
    xpReward: 500,
    rarity: 'epic',
  },
  {
    name: 'Level Up!',
    description: 'Reach level 5',
    icon: '🆙',
    category: 'level',
    criteria: { type: 'level', level: 5 },
    xpReward: 200,
    rarity: 'rare',
  },
  {
    name: 'Goal Getter',
    description: 'Meet your daily goal 5 times',
    icon: '🎯',
    category: 'daily',
    criteria: { type: 'daily_goals', count: 5 },
    xpReward: 150,
    rarity: 'common',
  },
  {
    name: 'Dedicated Learner',
    description: 'Meet your daily goal 30 times',
    icon: '📚',
    category: 'daily',
    criteria: { type: 'daily_goals', count: 30 },
    xpReward: 500,
    rarity: 'epic',
  },
];

async function seed() {
  try {
    console.log('🌱 Starting database seed...');

    // Sync database (force recreate tables)
    await sequelize.sync({ force: true });
    console.log('✅ Database tables created.');

    // Seed skills
    const createdSkills = {};
    for (const skill of skills) {
      const created = await Skill.create(skill);
      createdSkills[skill.slug] = created;
    }
    console.log(`✅ ${skills.length} skills seeded.`);

    // Seed exercises
    let exerciseCount = 0;
    for (const exercise of exercises) {
      const skill = createdSkills[exercise.skillSlug];
      if (skill) {
        await Exercise.create({
          ...exercise,
          skillId: skill.id,
        });
        exerciseCount++;
      }
    }
    console.log(`✅ ${exerciseCount} exercises seeded.`);

    // Seed achievements
    for (const achievement of achievements) {
      await Achievement.create(achievement);
    }
    console.log(`✅ ${achievements.length} achievements seeded.`);

    console.log('\n🎉 Database seeded successfully!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Seed error:', error);
    process.exit(1);
  }
}

seed();
