/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var cbs = require('./callbacks')
  , db = require('../lib/database');

exports.retrieve = function (req) {
  var user = req.handshake.user
    , limit = req.data.limit || 50
    , offset = req.data.offset || 0
    , order = req.data.order
    , filters = req.data.filters;
  if (user.role === 'client') {
    db.tasks.retrieve.forClient(user.id, offset, limit, order, filters, cbs.respond(req));
  } else if (user.role === 'helper') {
    db.tasks.retrieve.forHelper(user.id, offset, limit, order, filters, cbs.respond(req));
  } else if (user.role === 'subdepartment chief') {
    db.tasks.retrieve.forSubdepartmentChief(user.id, offset, limit, order, filters, cbs.respond(req));
  } else { // if (user.role === 'department chief'
    db.tasks.retrieve.forDepartmentChief(offset, limit, order, filters, cbs.respond(req));
  }
};

exports.save = function (req) {
  var user = req.handshake.user.id;
  if (user.role === 'client') {
    req.data.client_id = user.id;
    req.data.university_department_id = user.university_department_id;
  }
  db.tasks.save(req.data, cbs.respond(req));
};

exports.close = function (req) {
  db.tasks.close(req.data.taskId, req.handshake.user.id, cbs.respond(req));
};

exports.remove = function (req) {
  req.io.emit('err', 'tasks:remove not implemented');
};

exports['add helper'] = function (req) {
  db.tasks.addHelper(req.data.taskId, req.data.helperId, cbs.respond(req, { ok: true }));
};

exports['remove helper'] = function (req) {
  db.tasks.removeHelper(req.data.taskId, req.data.helperId, cbs.respond(req, { ok: true }));
};