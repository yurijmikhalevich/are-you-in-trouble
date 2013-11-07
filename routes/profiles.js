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
    , filters = req.data.filters || { id: req.handshake.user.id };
  db.profiles.retrieve(offset, limit, order, filters, cbs.respond(req));
};

exports.save = function (req) {
  if (!req.data.id) {
    req.data.id = req.handshake.user.id;
  }
  db.profiles.save(req.data, cbs.respond(req));
};

exports.remove = function (req) {
  db.profiles.remove(req.data.profileId, cbs.respond(req, { ok: true }));
};

exports['make client'] = function (req) {
  db.profiles.makeClient(req.data.userId, req.data.universityDepartmentId, cbs.respond(req));
};

exports['make helper'] = function (req) {
  db.profiles.makeHelper(req.data.userId, req.data.chief || false, req.data.subdepartmentId, cbs.respond(req));
};

exports['make department chief'] = function (req) {
  db.profiles.makeDepartmentChief(req.data.userId, cbs.respond(req));
};