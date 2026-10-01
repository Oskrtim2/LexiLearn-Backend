const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Attempt = sequelize.define('Attempt', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    studentProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    exerciseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    answers: {
      type: DataTypes.JSON,
      allowNull: false,
      defaultValue: [],
    },
    correctCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    totalCount: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    score: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    timeSpent: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    xpEarned: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    difficulty: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    completed: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  return Attempt;
};
