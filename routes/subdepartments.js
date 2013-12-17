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
  db.registries.retrieve('subdepartment', cbs.respond(req));
};


/**
 * @param {Object} req Express.io request object
 */
exports.save = function(req) {
  db.registries.save('subdepartment', req.data,
      cbs.doNext(req, function(subdepartment) {
        req.io.broadcast('subdepartment:update', subdepartment);
        req.io.respond(subdepartment);
      }));
};
