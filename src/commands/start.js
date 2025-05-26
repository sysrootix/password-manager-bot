const keyboards = require('../utils/keyboards');
const sessionManager = require('../utils/sessionManager');

/**
 * Обработчик команды /start
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 */
module.exports = async (bot, msg) => {
  const chatId = msg.chat.id;
  const userId = msg.from.id;
  
  // Сбрасываем состояние сессии
  sessionManager.setState(userId, sessionManager.STATES.IDLE);
  sessionManager.resetPasswordData(userId);
  sessionManager.resetTempData(userId);
  
  // Отправляем приветственное сообщение
  await bot.sendMessage(
    chatId,
    `👋 *Добро пожаловать в Password Manager Bot!*\n\nЯ помогу вам безопасно хранить ваши пароли и генерировать новые надежные пароли.\n\nВыберите действие в меню ниже:`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboards.mainMenu()
    }
  );
}; 