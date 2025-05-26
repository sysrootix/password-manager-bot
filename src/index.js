const TelegramBot = require('node-telegram-bot-api');
const config = require('../config/config');
const db = require('./db/database');
const backup = require('./utils/backup');
const autoDelete = require('./utils/autoDelete');

// Обработчики
const messageHandler = require('./handlers/messageHandler');
const callbackHandler = require('./handlers/callbackHandler');

// Команды
const startCommand = require('./commands/start');

// Инициализация бота
const bot = new TelegramBot(config.BOT_TOKEN, { polling: true });

/**
 * Инициализация и запуск бота
 */
async function main() {
  try {
    // Инициализируем базу данных
    await db.initDb();
    console.log('База данных инициализирована успешно');

    // Устанавливаем время удаления сообщений с паролями (2 минуты)
    autoDelete.setDefaultTimeout(120);
    console.log('Настроено автоматическое удаление сообщений с паролями через 2 минуты');

    // Запускаем планировщик резервных копий (каждый день в 3:00)
    backup.scheduleBackup('0 3 * * *');

    // Обработчик команды /start
    bot.onText(/\/start/, (msg) => startCommand(bot, msg));

    // Обработчик команды /backup для создания резервной копии по запросу
    bot.onText(/\/backup/, async (msg) => {
      const userId = msg.from.id;
      
      // Проверка прав доступа
      if (config.AUTHORIZED_USER_ID && userId.toString() !== config.AUTHORIZED_USER_ID) {
        await bot.sendMessage(msg.chat.id, '❌ У вас нет доступа к этой команде.');
        return;
      }
      
      // Создаем и отправляем резервную копию
      try {
        await bot.sendMessage(msg.chat.id, '📦 Создаю резервную копию базы данных...');
        await backup.createAndSendBackup();
      } catch (error) {
        console.error('Ошибка при создании резервной копии:', error);
        await bot.sendMessage(msg.chat.id, '❌ Ошибка при создании резервной копии. Подробности в логах.');
      }
    });

    // Обработчик входящих сообщений
    bot.on('message', (msg) => messageHandler(bot, msg));

    // Обработчик callback запросов от инлайн-кнопок
    bot.on('callback_query', (callbackQuery) => callbackHandler(bot, callbackQuery));

    console.log('Бот запущен!');
  } catch (error) {
    console.error('Ошибка при запуске бота:', error);
    process.exit(1);
  }
}

// Обработка необработанных ошибок
process.on('uncaughtException', (error) => {
  console.error('Необработанная ошибка:', error);
});

process.on('unhandledRejection', (error) => {
  console.error('Необработанный reject:', error);
});

// Запускаем бота
main(); 