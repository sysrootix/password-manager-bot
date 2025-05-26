const fs = require('fs');
const path = require('path');
const TelegramBot = require('node-telegram-bot-api');
const config = require('../../config/config');
const schedule = require('node-schedule');

/**
 * Модуль для создания и отправки резервных копий базы данных
 */
class BackupManager {
  constructor() {
    this.bot = new TelegramBot(config.BOT_TOKEN);
    this.backupDir = path.join(__dirname, '../../backups');
    
    // Создаем директорию для резервных копий, если её нет
    if (!fs.existsSync(this.backupDir)) {
      fs.mkdirSync(this.backupDir, { recursive: true });
    }
  }

  /**
   * Запускает планировщик задач для создания резервных копий
   * @param {string} cronSchedule - Расписание в cron-формате (по умолчанию каждый день в 3:00)
   */
  scheduleBackup(cronSchedule = '0 3 * * *') {
    // Создаем задачу, которая будет выполняться по расписанию
    schedule.scheduleJob(cronSchedule, () => {
      this.createAndSendBackup()
        .then(() => console.log(`Резервная копия успешно создана и отправлена ${new Date()}`))
        .catch(err => console.error('Ошибка при создании резервной копии:', err));
    });
    
    console.log(`Запланировано автоматическое резервное копирование по расписанию: ${cronSchedule}`);
  }

  /**
   * Создает резервную копию базы данных и отправляет её пользователю
   * @returns {Promise<void>}
   */
  async createAndSendBackup() {
    try {
      // Создаем имя файла резервной копии на основе текущей даты
      const date = new Date();
      const filename = `backup_${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}.db`;
      const backupPath = path.join(this.backupDir, filename);

      // Копируем файл базы данных
      const dbPath = path.resolve(config.DB_PATH);
      fs.copyFileSync(dbPath, backupPath);

      // Отправляем файл резервной копии пользователю
      if (config.AUTHORIZED_USER_ID) {
        await this.bot.sendDocument(
          config.AUTHORIZED_USER_ID, 
          backupPath, 
          { 
            caption: '📦 Ежедневная резервная копия базы данных паролей.\n\nСохраните этот файл в надежном месте.' 
          }
        );
      }

      // Удаляем старые резервные копии (оставляем только последние 7)
      this.cleanupOldBackups();

      return true;
    } catch (error) {
      console.error('Ошибка при создании и отправке резервной копии:', error);
      throw error;
    }
  }

  /**
   * Удаляет старые резервные копии, оставляя только последние 7
   */
  cleanupOldBackups() {
    try {
      const files = fs.readdirSync(this.backupDir)
        .filter(file => file.startsWith('backup_') && file.endsWith('.db'))
        .map(file => ({
          name: file,
          path: path.join(this.backupDir, file),
          time: fs.statSync(path.join(this.backupDir, file)).mtime.getTime()
        }))
        .sort((a, b) => b.time - a.time); // Сортируем по дате изменения (от новых к старым)

      // Удаляем все файлы, кроме последних 7
      if (files.length > 7) {
        files.slice(7).forEach(file => {
          fs.unlinkSync(file.path);
          console.log(`Удалена старая резервная копия: ${file.name}`);
        });
      }
    } catch (error) {
      console.error('Ошибка при очистке старых резервных копий:', error);
    }
  }
}

module.exports = new BackupManager(); 