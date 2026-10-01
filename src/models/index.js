const { Sequelize } = require('sequelize');
const dbConfig = require('../config/database');

// Initialize Sequelize
const sequelize = new Sequelize(dbConfig);

// Import model definitions
const User = require('./User')(sequelize);
const StudentProfile = require('./StudentProfile')(sequelize);
const Skill = require('./Skill')(sequelize);
const StudentSkill = require('./StudentSkill')(sequelize);
const Exercise = require('./Exercise')(sequelize);
const Attempt = require('./Attempt')(sequelize);
const Assessment = require('./Assessment')(sequelize);
const AssessmentResponse = require('./AssessmentResponse')(sequelize);
const Achievement = require('./Achievement')(sequelize);
const StudentAchievement = require('./StudentAchievement')(sequelize);
const LearningPath = require('./LearningPath')(sequelize);
const DailyProgress = require('./DailyProgress')(sequelize);
const Document = require('./Document')(sequelize);

// ─── Associations ────────────────────────────────────────────

// User <-> StudentProfile (1:1)
User.hasOne(StudentProfile, { foreignKey: 'userId', as: 'profile' });
StudentProfile.belongsTo(User, { foreignKey: 'userId', as: 'user' });

// StudentProfile <-> StudentSkill (1:N)
StudentProfile.hasMany(StudentSkill, { foreignKey: 'studentProfileId', as: 'skills' });
StudentSkill.belongsTo(StudentProfile, { foreignKey: 'studentProfileId' });

// Skill <-> StudentSkill (1:N)
Skill.hasMany(StudentSkill, { foreignKey: 'skillId', as: 'studentSkills' });
StudentSkill.belongsTo(Skill, { foreignKey: 'skillId', as: 'skill' });

// Skill <-> Exercise (1:N)
Skill.hasMany(Exercise, { foreignKey: 'skillId', as: 'exercises' });
Exercise.belongsTo(Skill, { foreignKey: 'skillId', as: 'skill' });

// StudentProfile <-> Attempt (1:N)
StudentProfile.hasMany(Attempt, { foreignKey: 'studentProfileId', as: 'attempts' });
Attempt.belongsTo(StudentProfile, { foreignKey: 'studentProfileId' });

// Exercise <-> Attempt (1:N)
Exercise.hasMany(Attempt, { foreignKey: 'exerciseId', as: 'attempts' });
Attempt.belongsTo(Exercise, { foreignKey: 'exerciseId', as: 'exercise' });

// StudentProfile <-> Assessment (1:N)
StudentProfile.hasMany(Assessment, { foreignKey: 'studentProfileId', as: 'assessments' });
Assessment.belongsTo(StudentProfile, { foreignKey: 'studentProfileId' });

// Assessment <-> AssessmentResponse (1:N)
Assessment.hasMany(AssessmentResponse, { foreignKey: 'assessmentId', as: 'responses' });
AssessmentResponse.belongsTo(Assessment, { foreignKey: 'assessmentId' });

// Skill <-> AssessmentResponse (1:N)
Skill.hasMany(AssessmentResponse, { foreignKey: 'skillId' });
AssessmentResponse.belongsTo(Skill, { foreignKey: 'skillId', as: 'skill' });

// StudentProfile <-> StudentAchievement (1:N)
StudentProfile.hasMany(StudentAchievement, { foreignKey: 'studentProfileId', as: 'achievements' });
StudentAchievement.belongsTo(StudentProfile, { foreignKey: 'studentProfileId' });

// Achievement <-> StudentAchievement (1:N)
Achievement.hasMany(StudentAchievement, { foreignKey: 'achievementId' });
StudentAchievement.belongsTo(Achievement, { foreignKey: 'achievementId', as: 'achievement' });

// StudentProfile <-> LearningPath (1:N)
StudentProfile.hasMany(LearningPath, { foreignKey: 'studentProfileId', as: 'learningPaths' });
LearningPath.belongsTo(StudentProfile, { foreignKey: 'studentProfileId' });

// Skill <-> LearningPath (1:N)
Skill.hasMany(LearningPath, { foreignKey: 'skillId' });
LearningPath.belongsTo(Skill, { foreignKey: 'skillId', as: 'skill' });

// StudentProfile <-> DailyProgress (1:N)
StudentProfile.hasMany(DailyProgress, { foreignKey: 'studentProfileId', as: 'dailyProgress' });
DailyProgress.belongsTo(StudentProfile, { foreignKey: 'studentProfileId' });

// StudentProfile <-> Document (1:N)
StudentProfile.hasMany(Document, { foreignKey: 'studentProfileId', as: 'documents' });
Document.belongsTo(StudentProfile, { foreignKey: 'studentProfileId' });

module.exports = {
  sequelize,
  User,
  StudentProfile,
  Skill,
  StudentSkill,
  Exercise,
  Attempt,
  Assessment,
  AssessmentResponse,
  Achievement,
  StudentAchievement,
  LearningPath,
  DailyProgress,
  Document,
};
