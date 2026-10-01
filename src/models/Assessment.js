const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Assessment = sequelize.define('Assessment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    studentProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      defaultValue: 'initial',
      validate: { isIn: [['initial', 'periodic', 'skill_check']] },
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'pending',
      validate: { isIn: [['pending', 'in_progress', 'completed']] },
    },
    results: {
      type: DataTypes.JSON,
      defaultValue: {},
    },
    totalScore: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    startedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    completedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  return Assessment;
};
