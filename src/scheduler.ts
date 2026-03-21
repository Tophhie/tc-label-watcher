import type { PDSConfig } from "./types/settings.js";
import { logger } from "./logger.js";
import { db } from "./db/index.js";
import cron from 'node-cron';
import { newAccounts } from "./db/schema.js";
import { sendAccountDigest } from "./mailer.js";

export const scheduleAccountDigest = (config: PDSConfig) => {
    logger.info(`Scheduling the new account daily digest email...`)

    let hour = config.digestHourOfDay ?? 1;
    if (hour > 23 || hour < 0) { 
        logger.error(
        "Error: settings.toml contains digestHourOfDay which is either greater then 23 or less than 0.",
        );
        process.exit(1);
    }

    logger.info(`New account digest email will be ran at hour ${hour} daily.`)

    let cronExpression = `0 0 ${hour} * * *`;
    cron.schedule(cronExpression, async () => {
        try {
            const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            const repos = await db.select().from(newAccounts);
            const filteredRepos = repos.filter(repo => repo.dateFound >= oneDayAgo);
            await sendAccountDigest(config.notifyEmails, config.host, filteredRepos);
        } catch (err) {
            logger.error(`Failed to send account digest: ${err}`);
        }
    });
    logger.info(`Finished scheduling new account daily digest email.`)
}