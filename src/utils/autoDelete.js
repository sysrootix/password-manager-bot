/**
 * Модуль для автоматического удаления сообщений с паролями 
 * после определенного времени для обеспечения безопасности
 */
class AutoDeleteManager {
  constructor() {
    // Хранилище сообщений, которые нужно удалить
    this.pendingDeletions = [];
    
    // Стандартное время до удаления сообщения (в миллисекундах)
    this.defaultTimeout = 60 * 1000; // 1 минута по умолчанию
  }

  /**
   * Планирует удаление сообщения через указанное время
   * @param {Object} bot - Объект бота
   * @param {number} chatId - ID чата
   * @param {number} messageId - ID сообщения
   * @param {number} timeout - Время до удаления (в миллисекундах)
   */
  scheduleDelete(bot, chatId, messageId, timeout = this.defaultTimeout) {
    // Добавляем задачу в список ожидающих удаления
    const deleteTask = {
      bot,
      chatId,
      messageId,
      timeout,
      timeoutId: setTimeout(() => {
        this.deleteMessage(deleteTask);
      }, timeout)
    };
    
    this.pendingDeletions.push(deleteTask);
  }

  /**
   * Удаляет сообщение и убирает его из списка ожидающих удаления
   * @param {Object} deleteTask - Задача на удаление
   */
  async deleteMessage(deleteTask) {
    try {
      await deleteTask.bot.deleteMessage(deleteTask.chatId, deleteTask.messageId);
      
      // Убираем задачу из списка ожидающих
      const index = this.pendingDeletions.findIndex(
        task => task.chatId === deleteTask.chatId && task.messageId === deleteTask.messageId
      );
      
      if (index !== -1) {
        this.pendingDeletions.splice(index, 1);
      }
    } catch (error) {
      console.warn(`Не удалось удалить сообщение ${deleteTask.messageId} в чате ${deleteTask.chatId}:`, error.message);
      
      // Если ошибка не связана с тем, что сообщение уже удалено, то пробуем ещё раз через секунду
      if (error.message !== 'ETELEGRAM: 400 Bad Request: message to delete not found') {
        setTimeout(() => {
          this.deleteMessage(deleteTask);
        }, 1000);
      }
    }
  }

  /**
   * Устанавливает новое время по умолчанию до удаления сообщений
   * @param {number} timeout - Новое время (в секундах)
   */
  setDefaultTimeout(timeout) {
    // Конвертируем из секунд в миллисекунды
    this.defaultTimeout = timeout * 1000;
  }

  /**
   * Отменяет удаление сообщения
   * @param {number} chatId - ID чата
   * @param {number} messageId - ID сообщения
   */
  cancelDeletion(chatId, messageId) {
    const index = this.pendingDeletions.findIndex(
      task => task.chatId === chatId && task.messageId === messageId
    );
    
    if (index !== -1) {
      clearTimeout(this.pendingDeletions[index].timeoutId);
      this.pendingDeletions.splice(index, 1);
    }
  }

  /**
   * Создает самоуничтожающееся сообщение с обратным отсчетом
   * @param {Object} bot - Объект бота
   * @param {number} chatId - ID чата
   * @param {string} text - Текст сообщения
   * @param {Object} options - Опции сообщения
   * @param {number} timeout - Время до удаления (в секундах)
   * @param {number} updateInterval - Интервал обновления таймера (в секундах)
   * @returns {Promise<Object>} - Отправленное сообщение
   */
  async sendSelfDestructMessage(bot, chatId, text, options = {}, timeout = 60, updateInterval = 10) {
    // Конвертируем в миллисекунды
    const timeoutMs = timeout * 1000;
    const updateIntervalMs = updateInterval * 1000;
    
    // Добавляем информацию о времени жизни сообщения
    const timerText = `\n\n⏱ Сообщение будет автоматически удалено через ${timeout} секунд`;
    
    // Отправляем сообщение
    const message = await bot.sendMessage(
      chatId,
      text + timerText,
      options
    );
    
    // Планируем удаление сообщения
    this.scheduleDelete(bot, chatId, message.message_id, timeoutMs);
    
    // Обновляем таймер, если задан интервал обновления
    if (updateInterval > 0 && updateInterval < timeout) {
      let remainingTime = timeout;
      const updateTimerId = setInterval(async () => {
        remainingTime -= updateInterval;
        
        if (remainingTime <= 0) {
          clearInterval(updateTimerId);
          return;
        }
        
        try {
          await bot.editMessageText(
            text + `\n\n⏱ Сообщение будет автоматически удалено через ${remainingTime} секунд`,
            {
              chat_id: chatId,
              message_id: message.message_id,
              ...options
            }
          );
        } catch (error) {
          // Если сообщение не может быть отредактировано (например, уже удалено),
          // просто очищаем интервал
          clearInterval(updateTimerId);
        }
      }, updateIntervalMs);
    }
    
    return message;
  }
}

module.exports = new AutoDeleteManager(); 