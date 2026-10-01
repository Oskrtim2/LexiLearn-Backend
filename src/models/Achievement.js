const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Achievement = sequelize.define('Achievement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    icon: {
      type: DataTypes.STRING,
      defaultValue: '🏆',
    },
    category: {
      type: DataTypes.STRING,
      defaultValue: 'general',
    },
    criteria: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    xpReward: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
    },
    rarity: {
      type: DataTypes.STRING,
      defaultValue: 'common',
      validate: { isIn: [['common', 'rare', 'epic', 'legendary']] },
    },
  });

  return Achievement;
};
