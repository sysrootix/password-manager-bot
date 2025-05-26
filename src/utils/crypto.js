const CryptoJS = require('crypto-js');
const config = require('../../config/config');

// Шифрование пароля
const encrypt = (text) => {
  return CryptoJS.AES.encrypt(text, config.ENCRYPTION_KEY).toString();
};

// Дешифрование пароля
const decrypt = (encryptedText) => {
  const bytes = CryptoJS.AES.decrypt(encryptedText, config.ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

module.exports = {
  encrypt,
  decrypt
}; 