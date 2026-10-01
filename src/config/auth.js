module.exports = {
  jwtSecret: process.env.JWT_SECRET || 'lexilearn_dev_secret',
  jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'lexilearn_dev_refresh_secret',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '24h',
  jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '7d',
  saltRounds: 12,
};
