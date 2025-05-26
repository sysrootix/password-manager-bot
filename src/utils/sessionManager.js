// Сессии пользователей
const sessions = {};

// Возможные состояния сессии
const STATES = {
  IDLE: 'IDLE',
  AWAITING_CATEGORY: 'AWAITING_CATEGORY',
  AWAITING_SERVICE: 'AWAITING_SERVICE',
  AWAITING_LOGIN: 'AWAITING_LOGIN',
  AWAITING_PASSWORD_CHOICE: 'AWAITING_PASSWORD_CHOICE',
  AWAITING_PASSWORD: 'AWAITING_PASSWORD',
  AWAITING_PASSWORD_LENGTH: 'AWAITING_PASSWORD_LENGTH',
  AWAITING_URL: 'AWAITING_URL',
  CONFIRM_SAVE: 'CONFIRM_SAVE',
  GENERATOR_SETTINGS: 'GENERATOR_SETTINGS',
  EDITING_PASSWORD: 'EDITING_PASSWORD',
  EDITING_CATEGORY: 'EDITING_CATEGORY',
  EDITING_SERVICE: 'EDITING_SERVICE',
  EDITING_LOGIN: 'EDITING_LOGIN',
  EDITING_URL: 'EDITING_URL'
};

/**
 * Создает новую сессию пользователя
 * @param {number} userId - ID пользователя
 */
const createSession = (userId) => {
  sessions[userId] = {
    state: STATES.IDLE,
    passwordData: {
      category: '',
      service: '',
      login: '',
      password: '',
      url: ''
    },
    tempData: {},
    generatorSettings: {
      length: 12,
      uppercase: true,
      numbers: true,
      symbols: true
    },
    editingId: null
  };
};

/**
 * Получает состояние сессии пользователя
 * @param {number} userId - ID пользователя
 * @returns {Object} Сессия пользователя
 */
const getSession = (userId) => {
  if (!sessions[userId]) {
    createSession(userId);
  }
  return sessions[userId];
};

/**
 * Устанавливает состояние сессии
 * @param {number} userId - ID пользователя
 * @param {string} state - Новое состояние из STATES
 */
const setState = (userId, state) => {
  const session = getSession(userId);
  session.state = state;
};

/**
 * Получает текущее состояние сессии
 * @param {number} userId - ID пользователя
 * @returns {string} Текущее состояние
 */
const getState = (userId) => {
  const session = getSession(userId);
  return session.state;
};

/**
 * Устанавливает данные о пароле
 * @param {number} userId - ID пользователя
 * @param {Object} passwordData - Данные о пароле
 */
const setPasswordData = (userId, passwordData) => {
  const session = getSession(userId);
  session.passwordData = { ...session.passwordData, ...passwordData };
};

/**
 * Получает данные о пароле
 * @param {number} userId - ID пользователя
 * @returns {Object} Данные о пароле
 */
const getPasswordData = (userId) => {
  const session = getSession(userId);
  return session.passwordData;
};

/**
 * Сбрасывает данные о пароле
 * @param {number} userId - ID пользователя
 */
const resetPasswordData = (userId) => {
  const session = getSession(userId);
  session.passwordData = {
    category: '',
    service: '',
    login: '',
    password: '',
    url: ''
  };
  session.editingId = null;
};

/**
 * Устанавливает временные данные
 * @param {number} userId - ID пользователя
 * @param {string} key - Ключ данных
 * @param {*} value - Значение
 */
const setTempData = (userId, key, value) => {
  const session = getSession(userId);
  session.tempData[key] = value;
};

/**
 * Получает временные данные
 * @param {number} userId - ID пользователя
 * @param {string} key - Ключ данных
 * @returns {*} Значение
 */
const getTempData = (userId, key) => {
  const session = getSession(userId);
  return session.tempData[key];
};

/**
 * Сбрасывает временные данные
 * @param {number} userId - ID пользователя
 */
const resetTempData = (userId) => {
  const session = getSession(userId);
  session.tempData = {};
};

/**
 * Устанавливает настройки генератора паролей
 * @param {number} userId - ID пользователя
 * @param {Object} settings - Настройки
 */
const setGeneratorSettings = (userId, settings) => {
  const session = getSession(userId);
  session.generatorSettings = { ...session.generatorSettings, ...settings };
};

/**
 * Получает настройки генератора паролей
 * @param {number} userId - ID пользователя
 * @returns {Object} Настройки
 */
const getGeneratorSettings = (userId) => {
  const session = getSession(userId);
  return session.generatorSettings;
};

/**
 * Устанавливает ID записи для редактирования
 * @param {number} userId - ID пользователя
 * @param {string} id - ID записи
 */
const setEditingId = (userId, id) => {
  const session = getSession(userId);
  session.editingId = id;
};

/**
 * Получает ID записи для редактирования
 * @param {number} userId - ID пользователя
 * @returns {string} ID записи
 */
const getEditingId = (userId) => {
  const session = getSession(userId);
  return session.editingId;
};

module.exports = {
  STATES,
  createSession,
  getSession,
  setState,
  getState,
  setPasswordData,
  getPasswordData,
  resetPasswordData,
  setTempData,
  getTempData,
  resetTempData,
  setGeneratorSettings,
  getGeneratorSettings,
  setEditingId,
  getEditingId
}; 