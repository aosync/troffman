const Sequelize = require('sequelize');

module.exports = class TroffmanDatabase extends Sequelize {
    constructor(path) {
        super('database', 'user', 'password', {
            host: 'localhost',
            dialect: 'sqlite',
            logging: false,
            storage: path,
        });

        this.Auser = this.define('ausers', {
            userId: {
                type: Sequelize.STRING,
                unique: true,
            },
        });
        this.Aguild = this.define('aguilds', {
            guildId: {
                type: Sequelize.STRING,
                unique: true,
            },
        });
    }
};
