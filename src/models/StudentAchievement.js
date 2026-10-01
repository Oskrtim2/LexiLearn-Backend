const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const StudentAchievement = sequelize.define('StudentAchievement', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    studentProfileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    achievementId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    unlockedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });

  return StudentAchievement;
};
