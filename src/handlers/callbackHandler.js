const { v4: uuidv4 } = require('uuid');
const keyboards = require('../utils/keyboards');
const sessionManager = require('../utils/sessionManager');
const db = require('../db/database');
const crypto = require('../utils/crypto');
const passwordGenerator = require('../utils/passwordGenerator');
const config = require('../../config/config');

/**
 * Обработчик callback запросов для инлайн кнопок
 * @param {Object} bot - Объект бота
 * @param {Object} callbackQuery - Объект callback запроса
 */
module.exports = async (bot, callbackQuery) => {
  const chatId = callbackQuery.message.chat.id;
  const userId = callbackQuery.from.id;
  const messageId = callbackQuery.message.message_id;
  const data = callbackQuery.data;

  // Проверка авторизации
  if (config.AUTHORIZED_USER_ID && userId.toString() !== config.AUTHORIZED_USER_ID) {
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: '❌ У вас нет доступа к этому боту',
      show_alert: true
    });
    return;
  }

  // Управление callback запросами
  try {
    // Главное меню
    if (data === 'back_to_main') {
      await backToMain(bot, chatId, messageId);
      sessionManager.setState(userId, sessionManager.STATES.IDLE);
      sessionManager.resetPasswordData(userId);
    }
    // Просмотр категорий
    else if (data === 'view_categories') {
      await showCategories(bot, chatId, messageId);
    }
    // Выбор категории
    else if (data.startsWith('category_')) {
      const category = data.split('_')[1];
      await showServices(bot, chatId, messageId, category);
    }
    // Выбор сервиса
    else if (data.startsWith('service_')) {
      const id = data.split('_')[1];
      await showPasswordDetails(bot, chatId, messageId, id);
    }
    // Пропустить ввод URL
    else if (data === 'skip_url') {
      // Сохраняем пустой URL
      sessionManager.setPasswordData(userId, { url: '' });
      sessionManager.setState(userId, sessionManager.STATES.AWAITING_PASSWORD_CHOICE);
      
      // Переходим к выбору способа создания пароля
      await bot.editMessageText(
        '📝 *Шаг 5/5:* Выберите способ создания пароля:',
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: keyboards.passwordChoiceKeyboard()
        }
      );
    }
    // Добавление пароля
    else if (data === 'add_password') {
      await startAddPassword(bot, chatId, messageId, userId);
    }
    // Генератор паролей
    else if (data === 'password_generator') {
      await showPasswordGenerator(bot, chatId, messageId, userId);
    }
    // Настройки
    else if (data === 'settings') {
      await showSettings(bot, chatId, messageId);
    }
    // Выбор длины пароля в генераторе
    else if (data === 'length_12') {
      await showPasswordLengthOptions(bot, chatId, messageId);
    }
    // Установка длины пароля
    else if (data.startsWith('set_length_')) {
      const length = parseInt(data.split('_')[2]);
      sessionManager.setGeneratorSettings(userId, { length });
      await updatePasswordGeneratorSettings(bot, chatId, messageId, userId);
    }
    // Включение/отключение заглавных букв
    else if (data === 'toggle_uppercase') {
      const settings = sessionManager.getGeneratorSettings(userId);
      sessionManager.setGeneratorSettings(userId, { uppercase: !settings.uppercase });
      await updatePasswordGeneratorSettings(bot, chatId, messageId, userId);
    }
    // Включение/отключение цифр
    else if (data === 'toggle_numbers') {
      const settings = sessionManager.getGeneratorSettings(userId);
      sessionManager.setGeneratorSettings(userId, { numbers: !settings.numbers });
      await updatePasswordGeneratorSettings(bot, chatId, messageId, userId);
    }
    // Включение/отключение специальных символов
    else if (data === 'toggle_symbols') {
      const settings = sessionManager.getGeneratorSettings(userId);
      sessionManager.setGeneratorSettings(userId, { symbols: !settings.symbols });
      await updatePasswordGeneratorSettings(bot, chatId, messageId, userId);
    }
    // Генерация пароля
    else if (data === 'generate') {
      const settings = sessionManager.getGeneratorSettings(userId);
      const password = passwordGenerator.generatePassword(settings);
      
      await bot.editMessageText(
        `🔐 *Сгенерированный пароль:*\n\n\`${password}\`\n\nНажмите на пароль, чтобы выделить его и скопировать.`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔄 Сгенерировать новый', callback_data: 'generate' }],
              [{ text: '⚙️ Настройки', callback_data: 'password_generator' }],
              [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
            ]
          }
        }
      );
    }
    // Выбор генерации пароля при добавлении записи
    else if (data === 'generate_password') {
      // Запрашиваем длину пароля
      sessionManager.setState(userId, sessionManager.STATES.AWAITING_PASSWORD_LENGTH);
      
      await bot.editMessageText(
        '🔢 Введите длину пароля (или нажмите "По умолчанию" для создания пароля длиной 16 символов):',
        {
          chat_id: chatId,
          message_id: messageId,
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
    }
    // Выбор длины пароля
    else if (data.startsWith('password_length_')) {
      const length = parseInt(data.split('_')[2]);
      const settings = sessionManager.getGeneratorSettings(userId);
      settings.length = length;
      
      // Генерируем пароль с выбранной длиной
      const password = passwordGenerator.generatePassword(settings);
      
      // Сохраняем пароль во временные данные
      sessionManager.setPasswordData(userId, { password });
      sessionManager.setState(userId, sessionManager.STATES.CONFIRM_SAVE);
      
      // Показываем данные для сохранения
      const passwordData = sessionManager.getPasswordData(userId);
      
      const urlText = passwordData.url ? `\n*URL:* ${passwordData.url}` : '';
      await bot.editMessageText(
        `📝 *Проверьте введенные данные:*\n\n*Категория:* ${passwordData.category}\n*Сервис:* ${passwordData.service}\n*Логин:* ${passwordData.login}${urlText}\n*Пароль:* \`${passwordData.password}\`\n\nВсё верно?`,
        {
          chat_id: chatId,
          message_id: messageId,
          parse_mode: 'Markdown',
          reply_markup: keyboards.saveKeyboard()
        }
      );
    }
    // Выбор ввода пароля вручную
    else if (data === 'enter_password') {
      sessionManager.setState(userId, sessionManager.STATES.AWAITING_PASSWORD);
      
      await bot.editMessageText(
        '🔑 Введите пароль для сохранения:',
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '🔙 Назад', callback_data: 'add_password' }]
            ]
          }
        }
      );
    }
    // Сохранение пароля
    else if (data === 'save_password') {
      const passwordData = sessionManager.getPasswordData(userId);
      const editingId = sessionManager.getEditingId(userId);
      
      if (editingId) {
        // Редактирование существующей записи
        const encryptedPassword = crypto.encrypt(passwordData.password);
        await db.updatePassword(
          editingId,
          passwordData.category,
          passwordData.service,
          passwordData.login,
          encryptedPassword,
          passwordData.url
        );
        
        await bot.editMessageText(
          '✅ Пароль успешно обновлен!',
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: '📁 К списку паролей', callback_data: 'view_categories' }],
                [{ text: '🏠 На главную', callback_data: 'back_to_main' }]
              ]
            }
          }
        );
      } else {
        // Добавление новой записи
        const id = uuidv4();
        const encryptedPassword = crypto.encrypt(passwordData.password);
        
        await db.addPassword(
          id,
          passwordData.category,
          passwordData.service,
          passwordData.login,
          encryptedPassword,
          passwordData.url
        );
        
        await bot.editMessageText(
          '✅ Пароль успешно сохранен!',
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: '📁 К списку паролей', callback_data: 'view_categories' }],
                [{ text: '🏠 На главную', callback_data: 'back_to_main' }]
              ]
            }
          }
        );
      }
      
      // Сбрасываем состояние
      sessionManager.setState(userId, sessionManager.STATES.IDLE);
      sessionManager.resetPasswordData(userId);
    }
    // Редактирование пароля
    else if (data.startsWith('edit_')) {
      if (data === 'edit_category') {
        sessionManager.setState(userId, sessionManager.STATES.EDITING_CATEGORY);
        await bot.editMessageText(
          '✏️ Введите новую категорию:',
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Отмена', callback_data: 'back_to_edit' }]
              ]
            }
          }
        );
        return;
      } else if (data === 'edit_service') {
        sessionManager.setState(userId, sessionManager.STATES.EDITING_SERVICE);
        await bot.editMessageText(
          '✏️ Введите новое название сервиса:',
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Отмена', callback_data: 'back_to_edit' }]
              ]
            }
          }
        );
        return;
      } else if (data === 'edit_login') {
        sessionManager.setState(userId, sessionManager.STATES.EDITING_LOGIN);
        await bot.editMessageText(
          '✏️ Введите новый логин:',
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Отмена', callback_data: 'back_to_edit' }]
              ]
            }
          }
        );
        return;
      } else if (data === 'edit_password') {
        sessionManager.setState(userId, sessionManager.STATES.EDITING_PASSWORD);
        await bot.editMessageText(
          '✏️ Введите новый пароль:',
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: '🔙 Отмена', callback_data: 'back_to_edit' }]
              ]
            }
          }
        );
        return;
      } else if (data === 'edit_url') {
        sessionManager.setState(userId, sessionManager.STATES.EDITING_URL);
        await bot.editMessageText(
          '✏️ Введите новый URL:',
          {
            chat_id: chatId,
            message_id: messageId,
            reply_markup: {
              inline_keyboard: [
                [{ text: '⏩ Удалить URL', callback_data: 'delete_url' }],
                [{ text: '🔙 Отмена', callback_data: 'back_to_edit' }]
              ]
            }
          }
        );
        return;
      } else if (data === 'back_to_edit') {
        const id = sessionManager.getEditingId(userId);
        if (id) {
          const passwordRecord = await db.getPasswordById(id);
          if (passwordRecord) {
            await showEditOptions(bot, chatId, messageId, passwordRecord);
            return;
          }
        }
        // Если не удалось вернуться к редактированию
        await backToMain(bot, chatId, messageId);
        return;
      } else if (data === 'delete_url') {
        sessionManager.setPasswordData(userId, { url: '' });
        sessionManager.setState(userId, sessionManager.STATES.CONFIRM_SAVE);
        
        // Показываем данные для сохранения
        const passwordData = sessionManager.getPasswordData(userId);
        
        await bot.editMessageText(
          `📝 *Проверьте обновленные данные:*\n\n*Категория:* ${passwordData.category}\n*Сервис:* ${passwordData.service}\n*Логин:* ${passwordData.login}\n*Пароль:* \`${passwordData.password}\`\n\nURL был удален. Сохранить изменения?`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: keyboards.saveKeyboard()
          }
        );
        return;
      }

      const id = data.split('_')[1];
      const passwordRecord = await db.getPasswordById(id);
      
      if (passwordRecord) {
        // Дешифруем пароль
        const decryptedPassword = crypto.decrypt(passwordRecord.password);
        
        // Сохраняем данные для редактирования
        sessionManager.setPasswordData(userId, {
          category: passwordRecord.category,
          service: passwordRecord.service,
          login: passwordRecord.login,
          password: decryptedPassword,
          url: passwordRecord.url || ''
        });
        sessionManager.setEditingId(userId, id);
        
        // Переходим к редактированию
        await showEditOptions(bot, chatId, messageId, passwordRecord);
      }
    }
    // Удаление пароля
    else if (data.startsWith('delete_')) {
      const id = data.split('_')[1];
      const passwordRecord = await db.getPasswordById(id);
      
      if (passwordRecord) {
        await bot.editMessageText(
          `❓ Вы уверены, что хотите удалить запись для *${passwordRecord.service}*?`,
          {
            chat_id: chatId,
            message_id: messageId,
            parse_mode: 'Markdown',
            reply_markup: keyboards.confirmDeleteKeyboard(id, passwordRecord.category)
          }
        );
      }
    }
    // Подтверждение удаления
    else if (data.startsWith('confirm_delete_')) {
      const id = data.split('_')[2];
      await db.deletePassword(id);
      
      await bot.editMessageText(
        '✅ Запись успешно удалена!',
        {
          chat_id: chatId,
          message_id: messageId,
          reply_markup: {
            inline_keyboard: [
              [{ text: '📁 К списку паролей', callback_data: 'view_categories' }],
              [{ text: '🏠 На главную', callback_data: 'back_to_main' }]
            ]
          }
        }
      );
    }
    
    // Отвечаем на callback запрос
    await bot.answerCallbackQuery(callbackQuery.id);
  } catch (error) {
    console.error('Ошибка при обработке callback запроса:', error);
    
    await bot.answerCallbackQuery(callbackQuery.id, {
      text: '❌ Произошла ошибка. Попробуйте еще раз',
      show_alert: true
    });
  }
};

/**
 * Возвращает в главное меню
 * @param {Object} bot - Объект бота
 * @param {number} chatId - ID чата
 * @param {number} messageId - ID сообщения
 */
async function backToMain(bot, chatId, messageId) {
  await bot.editMessageText(
    '👋 *Добро пожаловать в Password Manager Bot!*\n\nЯ помогу вам безопасно хранить ваши пароли и генерировать новые надежные пароли.\n\nВыберите действие в меню ниже:',
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: keyboards.mainMenu()
    }
  );
}

/**
 * Показывает категории паролей
 * @param {Object} bot - Объект бота
 * @param {number} chatId - ID чата
 * @param {number} messageId - ID сообщения
 */
async function showCategories(bot, chatId, messageId) {
  const categories = await db.getCategories();
  
  if (categories.length === 0) {
    await bot.editMessageText(
      '📭 У вас пока нет сохраненных паролей. Добавьте первый пароль!',
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Добавить пароль', callback_data: 'add_password' }],
            [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
          ]
        }
      }
    );
    return;
  }
  
  await bot.editMessageText(
    '📂 *Выберите категорию:*',
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: keyboards.categoriesKeyboard(categories)
    }
  );
}

/**
 * Показывает сервисы в выбранной категории
 * @param {Object} bot - Объект бота
 * @param {number} chatId - ID чата
 * @param {number} messageId - ID сообщения
 * @param {string} category - Название категории
 */
async function showServices(bot, chatId, messageId, category) {
  const services = await db.getServicesByCategory(category);
  
  if (services.length === 0) {
    await bot.editMessageText(
      `📭 В категории *${category}* пока нет сохраненных паролей.`,
      {
        chat_id: chatId,
        message_id: messageId,
        parse_mode: 'Markdown',
        reply_markup: {
          inline_keyboard: [
            [{ text: '➕ Добавить пароль', callback_data: 'add_password' }],
            [{ text: '🔙 Назад', callback_data: 'view_categories' }]
          ]
        }
      }
    );
    return;
  }
  
  await bot.editMessageText(
    `📂 *Категория: ${category}*\n\nВыберите сервис:`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: keyboards.servicesKeyboard(services, category)
    }
  );
}

/**
 * Показывает детали выбранного пароля
 * @param {Object} bot - Объект бота
 * @param {number} chatId - ID чата
 * @param {number} messageId - ID сообщения
 * @param {string} id - ID пароля
 */
async function showPasswordDetails(bot, chatId, messageId, id) {
  const passwordRecord = await db.getPasswordById(id);
  
  if (!passwordRecord) {
    await bot.editMessageText(
      '❌ Запись не найдена. Возможно, она была удалена.',
      {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: {
          inline_keyboard: [
            [{ text: '🔙 Назад', callback_data: 'view_categories' }]
          ]
        }
      }
    );
    return;
  }
  
  // Дешифруем пароль
  const decryptedPassword = crypto.decrypt(passwordRecord.password);
  
  // Отправляем в закрытом виде, чтобы не показывать пароль в истории сообщений
  await bot.deleteMessage(chatId, messageId);
  
  // Формируем URL кнопку, если URL указан
  const urlButton = passwordRecord.url 
    ? [{ text: '🔗 Открыть сайт', url: passwordRecord.url }] 
    : [];
  
  // Сначала отправляем информацию без пароля
  const urlText = passwordRecord.url ? `\n*URL:* ${passwordRecord.url}` : '';
  await bot.sendMessage(
    chatId,
    `🔐 *Данные для входа:*\n\n*Категория:* ${passwordRecord.category}\n*Сервис:* ${passwordRecord.service}\n*Логин:* \`${passwordRecord.login}\`${urlText}\n\nОтправляю пароль отдельным сообщением...`,
    {
      parse_mode: 'Markdown'
    }
  );
  
  // Затем отправляем пароль, который будет виден только пользователю как самоуничтожающееся сообщение
  const inlineKeyboard = [];
  if (urlButton.length > 0) {
    inlineKeyboard.push(urlButton);
  }
  inlineKeyboard.push([
    { text: '🔁 Редактировать', callback_data: `edit_${id}` },
    { text: '❌ Удалить', callback_data: `delete_${id}` }
  ]);
  inlineKeyboard.push([{ text: '🔙 Назад', callback_data: `category_${passwordRecord.category}` }]);
  
  // Используем модуль самоуничтожающихся сообщений
  const autoDelete = require('../utils/autoDelete');
  
  // Отправляем пароль как самоуничтожающееся сообщение (120 секунд = 2 минуты)
  await autoDelete.sendSelfDestructMessage(
    bot,
    chatId,
    `🔑 *Пароль для ${passwordRecord.service}:*\n\n\`${decryptedPassword}\``,
    {
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: inlineKeyboard
      }
    },
    120, // Время жизни сообщения - 2 минуты
    30    // Обновление таймера каждые 30 секунд
  );
}

/**
 * Начинает процесс добавления пароля
 * @param {Object} bot - Объект бота
 * @param {number} chatId - ID чата
 * @param {number} messageId - ID сообщения
 * @param {number} userId - ID пользователя
 */
async function startAddPassword(bot, chatId, messageId, userId) {
  sessionManager.setState(userId, sessionManager.STATES.AWAITING_CATEGORY);
  sessionManager.resetPasswordData(userId);
  
  await bot.editMessageText(
    '📝 *Добавление нового пароля*\n\nШаг 1/4: Введите категорию (например: Почта, Игры, Финансы)',
    {
      chat_id: chatId,
      message_id: messageId,
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
 * Показывает настройки генератора паролей
 * @param {Object} bot - Объект бота
 * @param {number} chatId - ID чата
 * @param {number} messageId - ID сообщения 
 * @param {number} userId - ID пользователя
 */
async function showPasswordGenerator(bot, chatId, messageId, userId) {
  sessionManager.setState(userId, sessionManager.STATES.GENERATOR_SETTINGS);
  
  const settings = sessionManager.getGeneratorSettings(userId);
  
  await bot.editMessageText(
    '🧠 *Генератор паролей*\n\nНастройте параметры генерации пароля:',
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: `🔢 Длина: ${settings.length}`, callback_data: 'length_12' }],
          [
            { text: `🔠 Заглавные: ${settings.uppercase ? '✅' : '❌'}`, callback_data: 'toggle_uppercase' },
            { text: `🔢 Цифры: ${settings.numbers ? '✅' : '❌'}`, callback_data: 'toggle_numbers' }
          ],
          [
            { text: `#️⃣ Спецсимволы: ${settings.symbols ? '✅' : '❌'}`, callback_data: 'toggle_symbols' }
          ],
          [{ text: '🔄 Сгенерировать', callback_data: 'generate' }],
          [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
        ]
      }
    }
  );
}

/**
 * Обновляет настройки генератора паролей
 * @param {Object} bot - Объект бота
 * @param {number} chatId - ID чата
 * @param {number} messageId - ID сообщения
 * @param {number} userId - ID пользователя
 */
async function updatePasswordGeneratorSettings(bot, chatId, messageId, userId) {
  const settings = sessionManager.getGeneratorSettings(userId);
  
  await bot.editMessageText(
    '🧠 *Генератор паролей*\n\nНастройте параметры генерации пароля:',
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: `🔢 Длина: ${settings.length}`, callback_data: 'length_12' }],
          [
            { text: `🔠 Заглавные: ${settings.uppercase ? '✅' : '❌'}`, callback_data: 'toggle_uppercase' },
            { text: `🔢 Цифры: ${settings.numbers ? '✅' : '❌'}`, callback_data: 'toggle_numbers' }
          ],
          [
            { text: `#️⃣ Спецсимволы: ${settings.symbols ? '✅' : '❌'}`, callback_data: 'toggle_symbols' }
          ],
          [{ text: '🔄 Сгенерировать', callback_data: 'generate' }],
          [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
        ]
      }
    }
  );
}

/**
 * Показывает опции выбора длины пароля
 * @param {Object} bot - Объект бота
 * @param {number} chatId - ID чата
 * @param {number} messageId - ID сообщения
 */
async function showPasswordLengthOptions(bot, chatId, messageId) {
  await bot.editMessageText(
    '🔢 *Выберите длину пароля:*',
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: keyboards.passwordLengthKeyboard()
    }
  );
}

/**
 * Показывает настройки
 * @param {Object} bot - Объект бота
 * @param {number} chatId - ID чата
 * @param {number} messageId - ID сообщения
 */
async function showSettings(bot, chatId, messageId) {
  await bot.editMessageText(
    '⚙️ *Настройки*\n\nЭта функция пока находится в разработке.',
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
        ]
      }
    }
  );
}

/**
 * Показывает опции редактирования пароля
 * @param {Object} bot - Объект бота
 * @param {number} chatId - ID чата
 * @param {number} messageId - ID сообщения
 * @param {Object} passwordRecord - Запись о пароле
 */
async function showEditOptions(bot, chatId, messageId, passwordRecord) {
  const urlText = passwordRecord.url ? `\n*URL:* ${passwordRecord.url}` : '';
  
  await bot.editMessageText(
    `✏️ *Редактирование записи*\n\n*Категория:* ${passwordRecord.category}\n*Сервис:* ${passwordRecord.service}\n*Логин:* ${passwordRecord.login}${urlText}\n\nЧто вы хотите изменить?`,
    {
      chat_id: chatId,
      message_id: messageId,
      parse_mode: 'Markdown',
      reply_markup: {
        inline_keyboard: [
          [
            { text: '📝 Категорию', callback_data: 'edit_category' },
            { text: '📝 Сервис', callback_data: 'edit_service' }
          ],
          [
            { text: '📝 Логин', callback_data: 'edit_login' },
            { text: '🔑 Пароль', callback_data: 'edit_password' }
          ],
          [
            { text: '🔗 URL', callback_data: 'edit_url' }
          ],
          [{ text: '🔙 Назад', callback_data: `service_${passwordRecord.id}` }]
        ]
      }
    }
  );
} 