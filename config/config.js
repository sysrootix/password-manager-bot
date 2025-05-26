require('dotenv').config();

module.exports = {
  BOT_TOKEN: process.env.BOT_TOKEN || '',
  AUTHORIZED_USER_ID: process.env.AUTHORIZED_USER_ID || '',
  ENCRYPTION_KEY: process.env.ENCRYPTION_KEY || 'default-encryption-key',
  DB_PATH: './db/passwords.db'
}; 