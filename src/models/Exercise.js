const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Exercise = sequelize.define('Exercise', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    skillId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        isIn: [[
          'multiple_choice',
          'listen_select',
          'word_ordering',
          'fill_blank',
          'spelling',
          'reading_comprehension',
          'match_sounds',
          'identify_incorrect',
        ]],
      },
    },
    difficulty: {
      type: DataTypes.INTEGER,
      defaultValue: 1,
      validate: { min: 1, max: 10 },
    },
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    instructions: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    content: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    points: {
      type: DataTypes.INTEGER,
      defaultValue: 10,
    },
    estimatedTime: {
      type: DataTypes.INTEGER,
      defaultValue: 60,
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
  });

  return Exercise;
};
