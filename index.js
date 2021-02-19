const Troffman = require('./src/Troffman');
const winston = require('winston');

global.Logger = winston.createLogger({
    levels: winston.config.npm.levels,
    format: winston.format.printf(info => {
        let date = new Date();
        return `[${date.getDate()}/${(date.getMonth() + 1)}/${date.getFullYear()}-${date.getHours()}:${date.getMinutes()}:${date.getSeconds()}][${info.level.toUpperCase()}] ${info.message}`;
    }),
});

const bot = new Troffman('./config.toml');

if (bot.config.logging.console.enabled) {
    Logger.add(new winston.transports.Console({ level: bot.config.logging.console.minimal }));
}

if (bot.config.logging.file.enabled && bot.config.logging.file.path) {
    Logger.add(new winston.transports.File({ filename: bot.config.logging.file.path, level: bot.config.logging.file.minimal }));
    Logger.verbose(`Now logging to file ${bot.config.logging.file.path} with minimal level ${bot.config.logging.file.minimal}`);
}

Logger.verbose('Connecting the bot');

bot.connect();
