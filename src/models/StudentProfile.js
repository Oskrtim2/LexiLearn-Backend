const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StudentProfile = sequelize.define('StudentProfile', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true,
    },
    dateOfBirth: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    grade: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    currentLevel: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    totalXP: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    currentStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    longestStreak: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    lastActiveDate: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    dailyGoalXP: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
    },
    assessmentCompleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    preferences: {
      type: DataTypes.JSON,
      defaultValue: {
        fontSize: 'medium',
        highContrast: false,
        readingSpeed: 'normal',
        soundEnabled: true,
      },
    },
  });

  return StudentProfile;
};
