const Eris = require('eris');
const toml = require('toml');
const fs = require('fs');

const RegexFramework = require('./RegexFramework');
const Events = require('./Events');
const CommandLoader = require('./CommandLoader');
const TroffmanDatabase = require('./TroffmanDatabase');

module.exports = class Troffman extends Eris {
    constructor(configPath, options) {
        if (!fs.existsSync(configPath)) {
            fs.copyFileSync("./config.def.toml", configPath);
            process.exit(0);
        }
        let c = toml.parse(fs.readFileSync(configPath));
        super(c.token, options);
        this.config = c;
        if (!this.config.sudoers) {
            this.config.sudoers = [''];
        }
        else if (!Array.isArray(this.config.sudoers)) {
            this.config.sudoers = [''];
        }
        else if (this.config.sudoers.length <= 0) {
            this.config.sudoers = [''];
        }
        this._ds = Array.from(this.config.sudoers);
        this.db = new TroffmanDatabase(c.database);
        this.handler = new RegexFramework();
        Events(this);
        CommandLoader(this);
        this.db.sync();
    }
};
