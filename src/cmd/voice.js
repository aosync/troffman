const superagent = require('superagent');
const wait = require('../Wait');
const time = require('../Time');
const hastebin = require('../Hastebin');

const querystring = require('querystring');
const chunk = require('chunk-text');

async function resolveTracks(node, search) {
    let result;
    try {
        result = await superagent.get(`http://${node.host}:${node.port}/loadtracks?identifier=${search}`)
            .set('Authorization', node.password)
            .set('Accept', 'application/json');
    } catch (err) {
        throw err;
    }

    if (!result) {
        throw 'Unable play that video.';
    }

    return result.body; // array of tracks resolved from lavalink
}

function getLavalinkPlayer(channel, bot) {
    if (!channel || !channel.guild) {
        return Promise.reject('Not a guild channel.');
    }

    let player = bot.voiceConnections.get(channel.guild.id);
    if (player) {
        return Promise.resolve(player);
    }

    let options = {};
    if (channel.guild.region) {
        options.region = channel.guild.region;
    }

    return bot.joinVoiceChannel(channel.id, options);
}

function getRandomColor() {
    var letters = '0123456789ABCDEF';
    var color = '';
    for (var i = 0; i < 6; i++) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return parseInt(color);
}

async function crawl(player, bot, message) {
    if (bot.voices[message.channel.guild.id].queue.length === 0) {
        bot.voices[message.channel.guild.id].crawling = false;
        delete bot.voices[message.channel.guild.id].current;
        bot.leaveVoiceChannel(player.channelId);
        return;
    };

    bot.voices[message.channel.guild.id].crawling = true;
    let next = bot.voices[message.channel.guild.id].queue.shift();
    bot.voices[message.channel.guild.id].current = next;
    player.play(next.track);

    player.removeAllListeners('disconnect');
    player.once('disconnect', (err) => {
        if (err) {
            Logger.error(err);
        }
        bot.voices[message.channel.guild.id].crawling = false;
        delete bot.voices[message.channel.guild.id].current; //Attempt to fix disconnect bug, implement `come' command to recrawl is still to do. Refer to previous commit for previous implementation
        bot.leaveVoiceChannel(player.channelId);
    });

    player.removeAllListeners('error');
    player.once('error', (err) => {
        Logger.error(`Player error: ${err}`);
        // I do not know how it behaves after there's an error so I just put these in comment for now
        // bot.voices[message.channel.guild.id].crawling = false;
        // delete bot.voices[message.channel.guild.id].current;
        // bot.leaveVoiceChannel(player.channelId);
        
        // Just in case, continue crawling
        crawl(player, bot, message);
    });

    player.removeAllListeners('end');
    player.once('end', async (data) => {
        // REPLACED reason is emitted when playing without stopping, I ignore these to prevent skip loops
        if (data.reason && data.reason === 'REPLACED') return;
        await wait(750);
        crawl(player, bot, message);
    });
}

module.exports.loadModule = function loadModule(bot) {
    bot.handler.endpoint('^(?:add|meme|play|p|a)([;:-][0-9,-]+)? (.+)$', [], async (match, message) => {
        let ones = [];
        // The following messy loop parses playlist selection.
        // A hacky limitation has been used here to prevent abuse. A new system HAS to be used.
        if (match[1]) {
            let param = match[1].substring(1);
            let selectors = param.split(',');
            selectors.forEach(s => {
                let r = s.split('-');
                if (r.length === 2) {
                    let indS = parseInt(r[0]);
                    let indE = parseInt(r[1]);
                    if (indE <= indS) return;
                    if (indE - indS > 100) return;
                    for (let i = indS; i <= indE; i++) {
                        if (ones.indexOf(i) <= -1) {
                            ones.push(i);
                        }
                    }
                }
                else if (r.length === 1) {
                    let ind = parseInt(r[0]);
                    if (ones.indexOf(ind) <= -1) {
                        ones.push(ind);
                    }
                }
            });
        }

        if (!bot.voices[message.channel.guild.id]) bot.voices[message.channel.guild.id] = { queue: [] };

        let m = match[2];

        if (!m.match(/^<?https?:\/\//)) {
            m = 'ytsearch:' + m;
        }
        else if (m.charAt(0) === '<' && m.charAt(m.length - 1) === '>') {
            m = m.slice(1);
            m = m.slice(0, -1);
        }

        let t = await resolveTracks(bot._main, `${m}`);
        if (t.loadType === 'TRACK_LOADED' || t.loadType === 'SEARCH_RESULT') {
            let tr = t.tracks[0];
            if (tr.info.isStream) {
                bot.createMessage(message.channel.id, `I do not yet support streams, I'm sorry :(`).catch(Logger.error);
                return;
            }
            tr.adder = `${message.author.username}#${message.author.discriminator}`;
            bot.voices[message.channel.guild.id].queue.push(tr);
            let ign = !match[1] ? '' : ' Playlist selectors parameters have been ignored as it is a sole song.';
            bot.createMessage(message.channel.id, `\`${tr.info.title}\` has been added by \`${tr.adder}\`.${ign}`).catch(Logger.error);
        }
        else if (t.loadType === 'PLAYLIST_LOADED') {
            let co = 0;
            for (let i = 0; i < t.tracks.length; i++) {
                if (ones.indexOf(i + 1) > -1 || ones.length === 0) {
                    let tr = t.tracks[i];
                    tr.adder = `${message.author.username}#${message.author.discriminator}`;
                    bot.voices[message.channel.guild.id].queue.push(tr);
                    co++;
                }
            }
            bot.createMessage(message.channel.id, `${co} songs have been added to the queue by \`${message.author.username}#${message.author.discriminator}\``).catch(Logger.error);
        }
        else if (t.loadType === 'NO_MATCHES' || t.loadType === 'LOAD_FAILED') {
            bot.createMessage(message.channel.id, `No results, sorry.`).catch(Logger.error);
            return;
        }

        if (!message.member.voiceState.channelID) return;
        let channel = message.channel.guild.channels.find(m => m.id === message.member.voiceState.channelID);
        if (!bot.voices[message.channel.guild.id].crawling) {
            let player = await getLavalinkPlayer(channel, bot);
            player.switchChannel(message.member.voiceState.channelID, true);
            bot.createMessage(message.channel.id, 'Joined voice channel.').catch(Logger.error); // TEMPORARY
            crawl(player, bot, message);
        }
    });

    bot.handler.endpoint('^skip$', [], async (match, message) => {
        let player = bot.voiceConnections.get(message.channel.guild.id);
        if (player) {
            player.stop();
            bot.createMessage(message.channel.id, 'Current song skipped').catch(Logger.error);
        }
        else {
            bot.createMessage(message.channel.id, 'The bot wasn\'t playing.').catch(Logger.error);
        }
    });

    bot.handler.endpoint('^clear$', [], async (match, message) => {
        bot.voices[message.channel.guild.id].queue = [];
        bot.createMessage(message.channel.id, 'The current queue has been cleared!').catch(Logger.error);
    });

    bot.handler.endpoint('^(?:stop|quit|halt)!?$', [], async (match, message) => {
        let player = bot.voiceConnections.get(message.channel.guild.id);
        bot.voices[message.channel.guild.id].queue = [];
        if (player) {
            player.stop();
            bot.createMessage(message.channel.id, 'Successfully stopped!').catch(Logger.error);
        }
        else {
            bot.createMessage(message.channel.id, 'The bot wasn\'t playing but the queue still has been cleared.').catch(Logger.error);
        }
    });

    bot.handler.endpoint('^(?:come|resume)!?$', [], async (match, message) => {
        if (!message.member.voiceState.channelID) return;
        let channel = message.channel.guild.channels.find(m => m.id === message.member.voiceState.channelID);
        let player = bot.voiceConnections.get(message.channel.guild.id);
        if (player) {
            player.switchChannel(message.member.voiceState.channelID, true);
            if (player.paused) {
                player.resume();
                bot.createMessage(message.channel.id, 'Resumed the song.').catch(Logger.error);
            }
        }
        else {
            if (!message.member.voiceState.channelID) return;
            if (!bot.voices[message.channel.guild.id]) bot.voices[message.channel.guild.id] = { queue: [] };
            if (bot.voices[message.channel.guild.id].queue.length >= 1) {
                let channel = message.channel.guild.channels.find(m => m.id === message.member.voiceState.channelID);
                //if (!bot.voices[message.channel.guild.id].crawling) {
                let player = await getLavalinkPlayer(channel, bot);
                player.switchChannel(message.member.voiceState.channelID, true);
                bot.createMessage(message.channel.id, 'Joined voice channel.').catch(Logger.error); // TEMPORARY
                crawl(player, bot, message);
                //}
            }
            else {
                bot.createMessage(message.channel.id, 'The bot wasn\'t in any voice channel.').catch(Logger.error);
            }
        }
    });

    bot.handler.endpoint('^pause!?$', [], async (match, message) => {
        let player = bot.voiceConnections.get(message.channel.guild.id);
        if (player) {
            player.pause();
            bot.createMessage(message.channel.id, 'Song paused.').catch(Logger.error);
        }
        else {
            bot.createMessage(message.channel.id, 'The bot isn\'t in any voice channel.').catch(Logger.error);
        }
    });

    bot.handler.endpoint('^skip-to!? ([0-9]+)$', [], async (match, message) => {
        let player = bot.voiceConnections.get(message.channel.guild.id);
        if (!bot.voices[message.channel.guild.id]) bot.voices[message.channel.guild.id] = { queue: [] };
        let arg = parseInt(match[1]);
        if (arg <= 0) {
            bot.createMessage(message.channel.id, `The argument should be greater than 0 (the queue is one-indexed), but 0 was provided.`).catch(Logger.error);
            return;
        }
        if (arg > bot.voices[message.channel.guild.id].queue.length) {
            bot.createMessage(message.channel.id, `Can't skip that far, the queue is currently only ${bot.voices[message.channel.guild.id].queue.length} titles long :')`).catch(Logger.error);
            return;
        }
        bot.voices[message.channel.guild.id].queue = bot.voices[message.channel.guild.id].queue.splice(arg - 1);
        if (player) {
            player.stop();
            bot.createMessage(message.channel.id, `Current song and ${arg - 1} following where skipped.`).catch(Logger.error);
        }
        else {
            bot.createMessage(message.channel.id, `The bot wasn\'t playing but the ${arg - 1} next songs were successfully removed.`).catch(Logger.error);
        }
    });

    bot.handler.endpoint('^remove-to!? ([0-9]+)$', [], async (match, message) => {
        if (!bot.voices[message.channel.guild.id]) bot.voices[message.channel.guild.id] = { queue: [] };
        let arg = parseInt(match[1]);
        if (arg <= 0) {
            bot.createMessage(message.channel.id, `The argument should be greater than 0 (the queue is one-indexed), but 0 was provided.`).catch(Logger.error);
            return;
        }
        if (arg > bot.voices[message.channel.guild.id].queue.length) {
            bot.createMessage(message.channel.id, `Can't remove that far, the queue is currently only ${bot.voices[message.channel.guild.id].queue.length} titles long :')`).catch(Logger.error);
            return;
        }
        bot.voices[message.channel.guild.id].queue = bot.voices[message.channel.guild.id].queue.splice(arg);
        bot.createMessage(message.channel.id, `${arg} next songs in the queue were removed.`).catch(Logger.error);
    });

    bot.handler.endpoint('^remove!? ([0-9]+)$', [], async (match, message) => {
        if (!bot.voices[message.channel.guild.id]) bot.voices[message.channel.guild.id] = { queue: [] };
        let arg = parseInt(match[1]);
        if (arg <= 0) {
            bot.createMessage(message.channel.id, `The argument should be greater than 0 (the queue is one-indexed), but 0 was provided.`).catch(Logger.error);
            return;
        }
        if (arg > bot.voices[message.channel.guild.id].queue.length) {
            bot.createMessage(message.channel.id, `Can't remove that far, the queue is currently only ${bot.voices[message.channel.guild.id].queue.length} titles long :')`).catch(Logger.error);
            return;
        }
        bot.voices[message.channel.guild.id].queue.splice(arg - 1, 1);
        bot.createMessage(message.channel.id, `The ${arg}e song in the queue was removed.`).catch(Logger.error);
    });

    bot.handler.endpoint('^now\\??$', [], async (match, message) => {
        let player = bot.voiceConnections.get(message.channel.guild.id);
        if (player && bot.voices[message.channel.guild.id].current) {
            bot.createMessage(message.channel.id, `Now playing \`${bot.voices[message.channel.guild.id].current.info.title}\` at position ${time.msToMinutes(player.state.position)} added by \`${bot.voices[message.channel.guild.id].current.adder}\`. Total duration: ${time.msToMinutes(bot.voices[message.channel.guild.id].current.info.length)}`).catch(Logger.error);
        }
        else {
            bot.createMessage(message.channel.id, 'The bot is not playing anything ¯\\_(ツ)_/¯').catch(Logger.error);
        }
    });

    bot.handler.endpoint('^(?:queue|playlist|q|list)\\??$', [], async (match, message) => {
        if (!bot.voices[message.channel.guild.id].queue || bot.voices[message.channel.guild.id].queue.length === 0) {
            bot.createMessage(message.channel.id, 'The queue is empty!').catch(Logger.error);
            return;
        }
        let buff = "";
        let count = 1;
        bot.voices[message.channel.guild.id].queue.forEach(t => {
            buff += `${count}. ${t.info.title}, added by \`${t.adder}\` and lasts ${time.msToMinutes(t.info.length)}\n`;
            count++;
        });
        bot.createMessage(message.channel.id, buff).catch(Logger.error);
    });

    bot.handler.endpoint('^(?:lyrics|text)\\??(?: (.+))?$', [], async (match, message) => {
        let s = match[1] ? match[1] : null;
        if (!s && (bot.voices[message.channel.guild.id] && bot.voices[message.channel.guild.id].current)) s = bot.voices[message.channel.guild.id].current.info.title;
        if (!s) {
            bot.createMessage(message.channel.id, 'No request mentionned and no song currently playing ¯\\_(ツ)_/¯').catch(Logger.error);
            return;
        }
        let result;
        try {
            result = await superagent.get(`https://lyrics.tsu.sh/v1/?q=${s}`);   
        }
        catch (e) {
            return;
        }
        let res = JSON.parse(result.text);
        let chunks = chunk(res.content, 2048);
        if (chunks.length <= 4) {
            let col = getRandomColor();
            for (let i = 0; i < chunks.length; i++) {
                let data = {
                    embed: {
                        description: chunks[i],
                        color: col,
                    }
                }
                if (i === 0) data.embed.title = res.song.full_title;
                await bot.createMessage(message.channel.id, data).catch(Logger.error);
            }
        }
        else {
            let key = await hastebin(res.content);
            bot.createMessage(message.channel.id, `https://hasteb.in/${key}.txt`).catch(Logger.error);
        }
    });
};
