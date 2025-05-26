/**
 * Основное меню бота
 * @returns {Object} Клавиатура с основным меню
 */
const mainMenu = () => {
  return {
    inline_keyboard: [
      [{ text: '📁 Все записи', callback_data: 'view_categories' }],
      [{ text: '➕ Добавить пароль', callback_data: 'add_password' }],
      [{ text: '🧠 Генератор паролей', callback_data: 'password_generator' }],
      [{ text: '⚙️ Настройки', callback_data: 'settings' }]
    ]
  };
};

/**
 * Создает клавиатуру с категориями
 * @param {Array} categories - Массив категорий
 * @returns {Object} Клавиатура с категориями
 */
const categoriesKeyboard = (categories) => {
  const keyboard = [];
  
  // Добавляем категории по 2 в ряд
  for (let i = 0; i < categories.length; i += 2) {
    const row = [];
    row.push({ text: `${getCategoryEmoji(categories[i])} ${categories[i]}`, callback_data: `category_${categories[i]}` });
    
    if (i + 1 < categories.length) {
      row.push({ text: `${getCategoryEmoji(categories[i+1])} ${categories[i+1]}`, callback_data: `category_${categories[i+1]}` });
    }
    
    keyboard.push(row);
  }
  
  // Добавляем кнопку "Назад"
  keyboard.push([{ text: '🔙 Назад', callback_data: 'back_to_main' }]);
  
  return { inline_keyboard: keyboard };
};

/**
 * Создает клавиатуру с сервисами
 * @param {Array} services - Массив объектов с сервисами {id, service}
 * @param {String} category - Текущая категория
 * @returns {Object} Клавиатура с сервисами
 */
const servicesKeyboard = (services, category) => {
  const keyboard = [];
  
  // Добавляем сервисы по 1 в ряд
  services.forEach(service => {
    keyboard.push([{ 
      text: `${getServiceEmoji(service.service)} ${service.service}`, 
      callback_data: `service_${service.id}` 
    }]);
  });
  
  // Добавляем кнопку "Назад"
  keyboard.push([{ text: '🔙 Назад', callback_data: 'view_categories' }]);
  
  return { inline_keyboard: keyboard };
};

/**
 * Создает клавиатуру действий для записи
 * @param {String} id - ID записи
 * @returns {Object} Клавиатура с действиями
 */
const passwordActionsKeyboard = (id, categoryName) => {
  return {
    inline_keyboard: [
      [
        { text: '🔁 Редактировать', callback_data: `edit_${id}` },
        { text: '❌ Удалить', callback_data: `delete_${id}` }
      ],
      [{ text: '🔙 Назад', callback_data: `category_${categoryName}` }]
    ]
  };
};

/**
 * Клавиатура для выбора способа создания пароля
 * @returns {Object} Клавиатура с выбором
 */
const passwordChoiceKeyboard = () => {
  return {
    inline_keyboard: [
      [
        { text: '🔐 Сгенерировать пароль', callback_data: 'generate_password' },
        { text: '⌨️ Ввести вручную', callback_data: 'enter_password' }
      ],
      [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
    ]
  };
};

/**
 * Клавиатура с настройками генератора паролей
 * @returns {Object} Клавиатура настроек
 */
const passwordGeneratorKeyboard = () => {
  return {
    inline_keyboard: [
      [{ text: '🔢 Длина: 12', callback_data: 'length_12' }],
      [
        { text: '🔠 Заглавные: ✅', callback_data: 'toggle_uppercase' },
        { text: '🔢 Цифры: ✅', callback_data: 'toggle_numbers' }
      ],
      [
        { text: '#️⃣ Спецсимволы: ✅', callback_data: 'toggle_symbols' }
      ],
      [{ text: '🔄 Сгенерировать', callback_data: 'generate' }],
      [{ text: '🔙 Назад', callback_data: 'back_to_main' }]
    ]
  };
};

/**
 * Клавиатура с настройками длины пароля
 * @returns {Object} Клавиатура выбора длины
 */
const passwordLengthKeyboard = () => {
  return {
    inline_keyboard: [
      [
        { text: '8', callback_data: 'set_length_8' },
        { text: '10', callback_data: 'set_length_10' },
        { text: '12', callback_data: 'set_length_12' }
      ],
      [
        { text: '14', callback_data: 'set_length_14' },
        { text: '16', callback_data: 'set_length_16' },
        { text: '20', callback_data: 'set_length_20' }
      ],
      [{ text: '🔙 Назад', callback_data: 'password_generator' }]
    ]
  };
};

/**
 * Клавиатура для сохранения
 * @returns {Object} Клавиатура сохранения
 */
const saveKeyboard = () => {
  return {
    inline_keyboard: [
      [{ text: '✅ Сохранить', callback_data: 'save_password' }],
      [{ text: '🔙 Отмена', callback_data: 'back_to_main' }]
    ]
  };
};

/**
 * Клавиатура подтверждения удаления
 * @param {String} id - ID записи
 * @returns {Object} Клавиатура подтверждения
 */
const confirmDeleteKeyboard = (id, categoryName) => {
  return {
    inline_keyboard: [
      [
        { text: '✅ Да, удалить', callback_data: `confirm_delete_${id}` },
        { text: '❌ Нет, отмена', callback_data: `category_${categoryName}` }
      ]
    ]
  };
};

/**
 * Получает эмодзи для категории
 * @param {String} category - Название категории
 * @returns {String} Эмодзи
 */
const getCategoryEmoji = (category) => {
  const map = {
    'Почта': '💌',
    'Работа': '💼',
    'Игры': '🎮',
    'Финансы': '💰',
    'Социальные сети': '👥',
    'Покупки': '🛒',
    'Развлечения': '🎬',
    'Другое': '📝'
  };
  
  return map[category] || '📁';
};

/**
 * Получает эмодзи для сервиса
 * @param {String} service - Название сервиса
 * @returns {String} Эмодзи
 */
const getServiceEmoji = (service) => {
  const lowerService = service.toLowerCase();
  
  if (lowerService.includes('mail') || lowerService.includes('почта') || lowerService.includes('gmail')) {
    return '📧';
  }
  if (lowerService.includes('работа') || lowerService.includes('job')) {
    return '💼';
  }
  if (lowerService.includes('игра') || lowerService.includes('game')) {
    return '🎮';
  }
  if (lowerService.includes('bank') || lowerService.includes('card') || lowerService.includes('pay')) {
    return '💳';
  }
  if (lowerService.includes('facebook') || lowerService.includes('instagram') || lowerService.includes('vk')) {
    return '🌐';
  }
  
  return '🔑';
};

module.exports = {
  mainMenu,
  categoriesKeyboard,
  servicesKeyboard,
  passwordActionsKeyboard,
  passwordChoiceKeyboard,
  passwordGeneratorKeyboard,
  passwordLengthKeyboard,
  saveKeyboard,
  confirmDeleteKeyboard,
  getCategoryEmoji,
  getServiceEmoji
}; 