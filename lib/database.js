/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

module.exports = require('./database/pool');
module.exports.init = require('./database/init');
module.exports.tasks = require('./database/tasks');
module.exports.registries = require('./database/registries');
module.exports.taskComments = require('./database/task_comments');
module.exports.profiles = require('./database/profiles');