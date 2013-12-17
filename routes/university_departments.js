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
  db.registries.retrieve('university department', cbs.respond(req));
};


/**
 * @param {Object} req Express.io request object
 */
exports.save = function(req) {
  db.registries.save('university department', req.data,
      cbs.doNext(req, function(universityDepartment) {
        req.io.broadcast('university department:update', universityDepartment);
        req.io.respond(universityDepartment);
      }));
};
