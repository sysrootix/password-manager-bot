const sessionManager = require('../utils/sessionManager');
const db = require('../db/database');
const crypto = require('../utils/crypto');
const keyboards = require('../utils/keyboards');
const config = require('../../config/config');
const passwordGenerator = require('../utils/passwordGenerator');

/**
 * Обработчик входящих текстовых сообщений
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 */
module.exports = async (bot, msg) => {
  // Пропускаем команды, они обрабатываются отдельно
  if (msg.text && msg.text.startsWith('/')) {
    return;
  }

  const chatId = msg.chat.id;
  const userId = msg.from.id;
  const text = msg.text || '';

  // Проверка авторизации
  if (config.AUTHORIZED_USER_ID && userId.toString() !== config.AUTHORIZED_USER_ID) {
    await bot.sendMessage(
      chatId,
      '❌ У вас нет доступа к этому боту. Только авторизованный пользователь может использовать этот бот.'
    );
    return;
  }

  try {
    const state = sessionManager.getState(userId);

    switch (state) {
      // Ожидание ввода категории
      case sessionManager.STATES.AWAITING_CATEGORY:
        await handleCategoryInput(bot, msg, userId, text);
        break;

      // Ожидание ввода названия сервиса
      case sessionManager.STATES.AWAITING_SERVICE:
        await handleServiceInput(bot, msg, userId, text);
        break;

      // Ожидание ввода логина
      case sessionManager.STATES.AWAITING_LOGIN:
        await handleLoginInput(bot, msg, userId, text);
        break;

      // Ожидание ввода пароля вручную
      case sessionManager.STATES.AWAITING_PASSWORD:
        await handlePasswordInput(bot, msg, userId, text);
        break;

      // Ожидание ввода длины пароля
      case sessionManager.STATES.AWAITING_PASSWORD_LENGTH:
        await handlePasswordLengthInput(bot, msg, userId, text);
        break;

      // Ожидание ввода URL сервиса
      case sessionManager.STATES.AWAITING_URL:
        await handleUrlInput(bot, msg, userId, text);
        break;

      // Редактирование категории
      case sessionManager.STATES.EDITING_CATEGORY:
        await handleEditCategory(bot, msg, userId, text);
        break;

      // Редактирование сервиса
      case sessionManager.STATES.EDITING_SERVICE:
        await handleEditService(bot, msg, userId, text);
        break;

      // Редактирование логина
      case sessionManager.STATES.EDITING_LOGIN:
        await handleEditLogin(bot, msg, userId, text);
        break;

      // Редактирование пароля
      case sessionManager.STATES.EDITING_PASSWORD:
        await handleEditPassword(bot, msg, userId, text);
        break;

      // Редактирование URL
      case sessionManager.STATES.EDITING_URL:
        await handleEditUrl(bot, msg, userId, text);
        break;

      // Для неизвестных состояний
      default:
        await bot.sendMessage(
          chatId,
          'Нажмите /start для начала работы с ботом.'
        );
        break;
    }
  } catch (error) {
    console.error('Ошибка при обработке сообщения:', error);
    await bot.sendMessage(
      chatId,
      '❌ Произошла ошибка. Пожалуйста, попробуйте снова или нажмите /start для перезапуска.'
    );
  }
};

/**
 * Обработка ввода категории
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 * @param {number} userId - ID пользователя
 * @param {string} text - Текст сообщения
 */
async function handleCategoryInput(bot, msg, userId, text) {
  const chatId = msg.chat.id;
  
  if (!text.trim()) {
    await bot.sendMessage(
      chatId,
      '❌ Категория не может быть пустой. Пожалуйста, введите категорию:'
    );
    return;
  }
  
  // Сохраняем категорию
  sessionManager.setPasswordData(userId, { category: text.trim() });
  sessionManager.setState(userId, sessionManager.STATES.AWAITING_SERVICE);
  
  // Переходим к вводу сервиса
  await bot.sendMessage(
    chatId,
    '📝 *Шаг 2/5:* Введите название сервиса (например: Gmail, VK, Steam)',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Отмена', callback_data: 'back_to_main' }]
        ]
      }
    }
  );
}

/**
 * Обработка ввода сервиса
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 * @param {number} userId - ID пользователя
 * @param {string} text - Текст сообщения
 */
async function handleServiceInput(bot, msg, userId, text) {
  const chatId = msg.chat.id;
  
  if (!text.trim()) {
    await bot.sendMessage(
      chatId,
      '❌ Название сервиса не может быть пустым. Пожалуйста, введите название сервиса:'
    );
    return;
  }
  
  // Сохраняем сервис
  sessionManager.setPasswordData(userId, { service: text.trim() });
  sessionManager.setState(userId, sessionManager.STATES.AWAITING_LOGIN);
  
  // Переходим к вводу логина
  await bot.sendMessage(
    chatId,
    '📝 *Шаг 3/5:* Введите логин или email:',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Отмена', callback_data: 'back_to_main' }]
        ]
      }
    }
  );
}

/**
 * Обработка ввода логина
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 * @param {number} userId - ID пользователя
 * @param {string} text - Текст сообщения
 */
async function handleLoginInput(bot, msg, userId, text) {
  const chatId = msg.chat.id;
  
  if (!text.trim()) {
    await bot.sendMessage(
      chatId,
      '❌ Логин не может быть пустым. Пожалуйста, введите логин:'
    );
    return;
  }
  
  // Сохраняем логин
  sessionManager.setPasswordData(userId, { login: text.trim() });
  sessionManager.setState(userId, sessionManager.STATES.AWAITING_URL);
  
  // Переходим к вводу URL
  await bot.sendMessage(
    chatId,
    '📝 *Шаг 4/5:* Введите URL сервиса (необязательно):',
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '⏩ Пропустить', callback_data: 'skip_url' }],
          [{ text: '🔙 Отмена', callback_data: 'back_to_main' }]
        ]
      }
    }
  );
}

/**
 * Обработка ввода URL
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 * @param {number} userId - ID пользователя
 * @param {string} text - Текст сообщения
 */
async function handleUrlInput(bot, msg, userId, text) {
  const chatId = msg.chat.id;
  
  // Сохраняем URL (может быть пустым)
  sessionManager.setPasswordData(userId, { url: text.trim() });
  sessionManager.setState(userId, sessionManager.STATES.AWAITING_PASSWORD_CHOICE);
  
  // Переходим к выбору способа создания пароля
  await bot.sendMessage(
    chatId,
    '📝 *Шаг 5/5:* Выберите способ создания пароля:',
    {
      parse_mode: 'Markdown',
      reply_markup: keyboards.passwordChoiceKeyboard()
    }
  );
}

/**
 * Обработка ввода пароля вручную
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 * @param {number} userId - ID пользователя
 * @param {string} text - Текст сообщения
 */
async function handlePasswordInput(bot, msg, userId, text) {
  const chatId = msg.chat.id;
  
  if (!text.trim()) {
    await bot.sendMessage(
      chatId,
      '❌ Пароль не может быть пустым. Пожалуйста, введите пароль:'
    );
    return;
  }
  
  // Сохраняем пароль
  sessionManager.setPasswordData(userId, { password: text.trim() });
  sessionManager.setState(userId, sessionManager.STATES.CONFIRM_SAVE);
  
  // Удаляем сообщение с паролем для безопасности
  try {
    await bot.deleteMessage(chatId, msg.message_id);
  } catch (error) {
    console.warn('Не удалось удалить сообщение с паролем:', error);
  }
  
  // Показываем данные для сохранения
  const passwordData = sessionManager.getPasswordData(userId);
  
  const urlText = passwordData.url ? `\n*URL:* ${passwordData.url}` : '';
  await bot.sendMessage(
    chatId,
    `📝 *Проверьте введенные данные:*\n\n*Категория:* ${passwordData.category}\n*Сервис:* ${passwordData.service}\n*Логин:* ${passwordData.login}${urlText}\n*Пароль:* \`${passwordData.password}\`\n\nВсё верно?`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboards.saveKeyboard()
    }
  );
}

/**
 * Обработка редактирования категории
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 * @param {number} userId - ID пользователя
 * @param {string} text - Текст сообщения
 */
async function handleEditCategory(bot, msg, userId, text) {
  const chatId = msg.chat.id;
  
  if (!text.trim()) {
    await bot.sendMessage(
      chatId,
      '❌ Категория не может быть пустой. Пожалуйста, введите категорию:'
    );
    return;
  }
  
  // Сохраняем новую категорию
  sessionManager.setPasswordData(userId, { category: text.trim() });
  sessionManager.setState(userId, sessionManager.STATES.CONFIRM_SAVE);
  
  // Показываем данные для сохранения
  const passwordData = sessionManager.getPasswordData(userId);
  
  const urlText = passwordData.url ? `\n*URL:* ${passwordData.url}` : '';
  await bot.sendMessage(
    chatId,
    `📝 *Проверьте обновленные данные:*\n\n*Категория:* ${passwordData.category}\n*Сервис:* ${passwordData.service}\n*Логин:* ${passwordData.login}${urlText}\n*Пароль:* \`${passwordData.password}\`\n\nСохранить изменения?`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboards.saveKeyboard()
    }
  );
}

/**
 * Обработка редактирования сервиса
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 * @param {number} userId - ID пользователя
 * @param {string} text - Текст сообщения
 */
async function handleEditService(bot, msg, userId, text) {
  const chatId = msg.chat.id;
  
  if (!text.trim()) {
    await bot.sendMessage(
      chatId,
      '❌ Название сервиса не может быть пустым. Пожалуйста, введите название сервиса:'
    );
    return;
  }
  
  // Сохраняем новый сервис
  sessionManager.setPasswordData(userId, { service: text.trim() });
  sessionManager.setState(userId, sessionManager.STATES.CONFIRM_SAVE);
  
  // Показываем данные для сохранения
  const passwordData = sessionManager.getPasswordData(userId);
  
  const urlText = passwordData.url ? `\n*URL:* ${passwordData.url}` : '';
  await bot.sendMessage(
    chatId,
    `📝 *Проверьте обновленные данные:*\n\n*Категория:* ${passwordData.category}\n*Сервис:* ${passwordData.service}\n*Логин:* ${passwordData.login}${urlText}\n*Пароль:* \`${passwordData.password}\`\n\nСохранить изменения?`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboards.saveKeyboard()
    }
  );
}

/**
 * Обработка редактирования логина
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 * @param {number} userId - ID пользователя
 * @param {string} text - Текст сообщения
 */
async function handleEditLogin(bot, msg, userId, text) {
  const chatId = msg.chat.id;
  
  if (!text.trim()) {
    await bot.sendMessage(
      chatId,
      '❌ Логин не может быть пустым. Пожалуйста, введите логин:'
    );
    return;
  }
  
  // Сохраняем новый логин
  sessionManager.setPasswordData(userId, { login: text.trim() });
  sessionManager.setState(userId, sessionManager.STATES.CONFIRM_SAVE);
  
  // Показываем данные для сохранения
  const passwordData = sessionManager.getPasswordData(userId);
  
  const urlText = passwordData.url ? `\n*URL:* ${passwordData.url}` : '';
  await bot.sendMessage(
    chatId,
    `📝 *Проверьте обновленные данные:*\n\n*Категория:* ${passwordData.category}\n*Сервис:* ${passwordData.service}\n*Логин:* ${passwordData.login}${urlText}\n*Пароль:* \`${passwordData.password}\`\n\nСохранить изменения?`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboards.saveKeyboard()
    }
  );
}

/**
 * Обработка редактирования URL
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 * @param {number} userId - ID пользователя
 * @param {string} text - Текст сообщения
 */
async function handleEditUrl(bot, msg, userId, text) {
  const chatId = msg.chat.id;
  
  // URL может быть пустым
  sessionManager.setPasswordData(userId, { url: text.trim() });
  sessionManager.setState(userId, sessionManager.STATES.CONFIRM_SAVE);
  
  // Показываем данные для сохранения
  const passwordData = sessionManager.getPasswordData(userId);
  
  const urlText = passwordData.url ? `\n*URL:* ${passwordData.url}` : '';
  await bot.sendMessage(
    chatId,
    `📝 *Проверьте обновленные данные:*\n\n*Категория:* ${passwordData.category}\n*Сервис:* ${passwordData.service}\n*Логин:* ${passwordData.login}${urlText}\n*Пароль:* \`${passwordData.password}\`\n\nСохранить изменения?`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboards.saveKeyboard()
    }
  );
}

/**
 * Обработка редактирования пароля
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 * @param {number} userId - ID пользователя
 * @param {string} text - Текст сообщения
 */
async function handleEditPassword(bot, msg, userId, text) {
  const chatId = msg.chat.id;
  
  if (!text.trim()) {
    await bot.sendMessage(
      chatId,
      '❌ Пароль не может быть пустым. Пожалуйста, введите пароль:'
    );
    return;
  }
  
  // Сохраняем новый пароль
  sessionManager.setPasswordData(userId, { password: text.trim() });
  sessionManager.setState(userId, sessionManager.STATES.CONFIRM_SAVE);
  
  // Удаляем сообщение с паролем для безопасности
  try {
    await bot.deleteMessage(chatId, msg.message_id);
  } catch (error) {
    console.warn('Не удалось удалить сообщение с паролем:', error);
  }
  
  // Показываем данные для сохранения
  const passwordData = sessionManager.getPasswordData(userId);
  
  const urlText = passwordData.url ? `\n*URL:* ${passwordData.url}` : '';
  await bot.sendMessage(
    chatId,
    `📝 *Проверьте обновленные данные:*\n\n*Категория:* ${passwordData.category}\n*Сервис:* ${passwordData.service}\n*Логин:* ${passwordData.login}${urlText}\n*Пароль:* \`${passwordData.password}\`\n\nСохранить изменения?`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboards.saveKeyboard()
    }
  );
}

/**
 * Обработка ввода длины пароля
 * @param {Object} bot - Объект бота
 * @param {Object} msg - Объект сообщения
 * @param {number} userId - ID пользователя
 * @param {string} text - Текст сообщения
 */
async function handlePasswordLengthInput(bot, msg, userId, text) {
  const chatId = msg.chat.id;
  
  // Проверяем, является ли ввод числом
  const length = parseInt(text.trim());
  
  if (isNaN(length) || length < 4 || length > 100) {
    await bot.sendMessage(
      chatId,
      '❌ Длина пароля должна быть числом от 4 до 100. Пожалуйста, введите правильное значение:',
      {
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔟 10', callback_data: 'password_length_10' }],
            [{ text: '1️⃣2️⃣ 12', callback_data: 'password_length_12' }],
            [{ text: '1️⃣6️⃣ 16 (По умолчанию)', callback_data: 'password_length_16' }],
            [{ text: '2️⃣0️⃣ 20', callback_data: 'password_length_20' }],
            [{ text: '🔙 Назад', callback_data: 'add_password' }]
          ]
        }
      }
    );
    return;
  }
  
  // Устанавливаем длину пароля в настройках
  const settings = sessionManager.getGeneratorSettings(userId);
  settings.length = length;
  sessionManager.setGeneratorSettings(userId, settings);
  
  // Генерируем пароль с указанной длиной
  const password = passwordGenerator.generatePassword(settings);
  
  // Сохраняем пароль во временные данные
  sessionManager.setPasswordData(userId, { password });
  sessionManager.setState(userId, sessionManager.STATES.CONFIRM_SAVE);
  
  // Показываем данные для сохранения
  const passwordData = sessionManager.getPasswordData(userId);
  
  const urlText = passwordData.url ? `\n*URL:* ${passwordData.url}` : '';
  await bot.sendMessage(
    chatId,
    `📝 *Проверьте введенные данные:*\n\n*Категория:* ${passwordData.category}\n*Сервис:* ${passwordData.service}\n*Логин:* ${passwordData.login}${urlText}\n*Пароль:* \`${passwordData.password}\`\n\nВсё верно?`,
    {
      parse_mode: 'Markdown',
      reply_markup: keyboards.saveKeyboard()
    }
  );
} 