const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StudentSkill = sequelize.define('StudentSkill', {
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
      allowNull: false,
    },
    level: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
    },
    proficiency: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
      validate: { min: 0, max: 100 },
    },
    exercisesCompleted: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    correctRate: {
      type: DataTypes.FLOAT,
      defaultValue: 0,
    },
    totalAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
    correctAttempts: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
    },
  });

  return StudentSkill;
};
