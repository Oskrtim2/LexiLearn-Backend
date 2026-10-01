const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const AssessmentResponse = sequelize.define('AssessmentResponse', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    assessmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    skillId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    questionIndex: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    answer: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    correctAnswer: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    isCorrect: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    timeSpent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  });

  return AssessmentResponse;
};
