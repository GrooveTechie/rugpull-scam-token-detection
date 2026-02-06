import axios from 'axios';
import { logger } from '../lib/logger.js';
export async function sendTelegramAlert(config, text) {
    if (!config.telegramBotToken || !config.telegramChatId)
        return;
    const url = `https://api.telegram.org/bot${config.telegramBotToken}/sendMessage`;
    try {
        await axios.post(url, { chat_id: config.telegramChatId, text, parse_mode: 'Markdown' });
    }
    catch (err) {
        logger.error({ err }, 'Failed to send Telegram alert');
    }
}
//# sourceMappingURL=telegram.js.map