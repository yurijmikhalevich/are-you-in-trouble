/**
 * @license GPLv3
 * @author 0@39.yt (Yurij Mikhalevich)
 */

var anyDB = require('any-db'),
    settings = require('cat-settings');


/**
 * @type {Object} PostgreSQL connection pool
 */
module.exports = anyDB.createPool('postgres://' + settings.database.username +
    ':' + settings.database.password + '@' + settings.database.host + ':' +
    settings.database.port + '/' + settings.database.basename,
    {min: 2, max: 20});
