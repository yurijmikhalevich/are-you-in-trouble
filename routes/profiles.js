/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var cbs = require('./callbacks')
  , db = require('../lib/database');

exports.retrieve = function (req) {
  var limit = req.data.limit || 50
    , offset = req.data.offset || 0
    , order = req.data.order
    , filters = req.data.filters;
  db.profiles.retrieve(offset, limit, order, filters, cbs.respond(req));
};

exports.save = function (req) {
  if (!req.data.id) {
    req.data.id = req.handshake.user.id;
  }
  db.profiles.save(req.data, cbs.respond(req));
};

exports.remove = function (req) {
  db.profiles.remove(req.data.profileId, cbs.respond(req, { removed: true }));
};

exports['set role'] = function (req) {
  db.profiles.setRole(req.data.userId, req.data.role, cbs.respond(req, { updated: true }));
};

exports['set subdepartment'] = function (req) {
  db.profiles.setSubdepartment(req.data.userId, req.data.subdepartmentId,
    cbs.respond(req, { updated: true }));
};

exports['set university department'] = function (req) {
  db.profiles.setUniversityDepartment(req.data.userId, req.data.universityDepartmentId,
    cbs.respond(req, { updated: true }));
};