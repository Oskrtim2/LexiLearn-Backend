require('dotenv').config();

const config = {
  development: {
    dialect: process.env.DB_DIALECT || 'sqlite',
    storage: process.env.DB_STORAGE || './database.sqlite',
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
    },
  },
  production: {
    dialect: 'postgres',
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'lexilearn',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASS || '',
    logging: false,
    define: {
      timestamps: true,
      underscored: false,
    },
    pool: {
      max: 10,
      min: 2,
      acquire: 30000,
      idle: 10000,
    },
  },
};

const env = process.env.NODE_ENV || 'development';
module.exports = config[env];
