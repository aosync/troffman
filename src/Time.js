module.exports.msToMinutes = function msToMinutes(ms) {
    let d = new Date();
    d.setTime(ms);
    return `${d.getMinutes()}min ${d.getSeconds()}s`;
};