const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const LearningPath = sequelize.define('LearningPath', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    studentProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    skillId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    exerciseIds: {
      type: DataTypes.JSON,
      defaultValue: [],
    },
    currentIndex: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    status: {
      type: DataTypes.STRING,
      defaultValue: 'active',
      validate: { isIn: [['active', 'completed', 'paused']] },
    },
  });

  return LearningPath;
};
