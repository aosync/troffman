const superagent = require('superagent');

module.exports = async function hastebin(text) {
    let res = await superagent.post('https://hasteb.in/documents').send(text);
    return JSON.parse(res.text).key;
};