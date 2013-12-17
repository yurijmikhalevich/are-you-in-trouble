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
  var limit = req.data.limit || 50,
      offset = req.data.offset || 0,
      order = req.data.order,
      filters = req.data.filters || {id: req.handshake.user.id};
  db.profiles.retrieve(offset, limit, order, filters, cbs.respond(req));
};


/**
 * @param {Object} req Express.io request object
 */
exports.save = function(req) {
  if (!req.data.id) {
    req.data.id = req.handshake.user.id;
  }
  db.profiles.save(req.data, cbs.respond(req));
};


/**
 * @param {Object} req Express.io request object
 */
exports.remove = function(req) {
  db.profiles.remove(req.data.profileId, cbs.respond(req, {ok: true}));
};


/**
 * @param {Object} req Express.io request object
 */
exports['make client'] = function(req) {
  db.profiles.makeClient(req.data.userId, req.data.universityDepartmentId,
      cbs.respond(req));
};


/**
 * @param {Object} req Express.io request object
 */
exports['make helper'] = function(req) {
  db.profiles.makeHelper(req.data.userId, req.data.chief || false,
      req.data.subdepartmentId, cbs.respond(req));
};


/**
 * @param {Object} req Express.io request object
 */
exports['make department chief'] = function(req) {
  db.profiles.makeDepartmentChief(req.data.userId, cbs.respond(req));
};
