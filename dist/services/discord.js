import axios from 'axios';
import { logger } from '../lib/logger.js';
export async function sendDiscordAlert(config, title, description) {
    if (!config.discordWebhookUrl)
        return;
    try {
        await axios.post(config.discordWebhookUrl, {
            embeds: [
                {
                    title,
                    description,
                    color: 15158332
                }
            ]
        });
    }
    catch (err) {
        logger.error({ err }, 'Failed to send Discord alert');
    }
}
//# sourceMappingURL=discord.js.map