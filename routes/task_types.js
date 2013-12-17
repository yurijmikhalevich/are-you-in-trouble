/**
 * @license GPLv3
 * @author 0@39.yt (Yurij Mikhalevich)
 */

var cbs = require('./callbacks'),
    db = require('../lib/database');


/**
 * @param {Object} req Express.io request object
 */
exports.retrieve = function(req) {
  db.registries.retrieve('task type', cbs.respond(req));
};


/**
 * @param {Object} req Express.io request object
 */
exports.save = function(req) {
  db.registries.save('task type', req.data, cbs.doNext(req, function(taskType) {
    req.io.broadcast('task type:update', taskType);
    req.io.respond(taskType);
  }));
};
