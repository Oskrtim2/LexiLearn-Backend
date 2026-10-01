const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DailyProgress = sequelize.define('DailyProgress', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    studentProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    xpEarned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    exercisesCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    correctAnswers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalAnswers: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    timeSpent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    goalMet: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  return DailyProgress;
};
