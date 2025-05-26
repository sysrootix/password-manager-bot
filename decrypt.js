require('dotenv').config();
const CryptoJS = require('crypto-js');
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default-encryption-key';

console.log(ENCRYPTION_KEY);

// Замените строку ниже на ваш зашифрованный пароль
const encrypted = 'U2FsdGVkX18nT5iRPMNP0mTugjOsaRo6WpRhh9lzhyY=';

const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
const decrypted = bytes.toString(CryptoJS.enc.Utf8);

console.log('Расшифрованный пароль:', decrypted);