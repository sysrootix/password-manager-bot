const generator = require('generate-password');

/**
 * Генерирует пароль с указанными параметрами
 * @param {Object} options - Параметры генерации
 * @param {number} options.length - Длина пароля (по умолчанию 16)
 * @param {boolean} options.uppercase - Включать заглавные буквы (по умолчанию true)
 * @param {boolean} options.numbers - Включать цифры (по умолчанию true)
 * @param {boolean} options.symbols - Включать спецсимволы (по умолчанию true)
 * @returns {string} Сгенерированный пароль
 */
const generatePassword = (options = {}) => {
  const defaultOptions = {
    length: 16,
    uppercase: true,
    numbers: true,
    symbols: true,
    strict: true
  };

  const mergedOptions = { ...defaultOptions, ...options };
  
  return generator.generate(mergedOptions);
};

module.exports = {
  generatePassword
}; 