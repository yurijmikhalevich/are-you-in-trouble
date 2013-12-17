/**
 * @license GPLv3
 * @author 0@39.yt (Yurij Mikhalevich)
 */


/**
 * @type {exports}
 */
module.exports = require('./database/pool');


/**
 * @type {exports}
 */
module.exports.init = require('./database/init');


/**
 * @type {exports}
 */
module.exports.tasks = require('./database/tasks');


/**
 * @type {exports}
 */
module.exports.registries = require('./database/registries');


/**
 * @type {exports}
 */
module.exports.taskComments = require('./database/task_comments');


/**
 * @type {exports}
 */
module.exports.profiles = require('./database/profiles');
