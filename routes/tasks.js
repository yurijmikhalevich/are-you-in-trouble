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
    req.io.join('tasks_ud' + user.university_department_id);
    db.tasks.retrieve.forClient(user.id, offset, limit, order, filters, cbs.respond(req));
  } else if (user.role === 'helper') {
    req.io.join('tasks_h' + user.id);
    db.tasks.retrieve.forHelper(user.id, offset, limit, order, filters, cbs.respond(req));
  } else if (user.role === 'subdepartment chief') {
    req.io.join('tasks_sd' + user.subdepartment_id);
    db.tasks.retrieve.forSubdepartmentChief(user.id, offset, limit, order, filters, cbs.respond(req));
  } else { // if (user.role === 'department chief'
    req.io.join('tasks_dc');
    db.tasks.retrieve.forDepartmentChief(offset, limit, order, filters, cbs.respond(req));
  }
};

exports.save = function (req) {
  var user = req.handshake.user.id;
  if (user.role === 'client') {
    req.data.client_id = user.id;
    req.data.university_department_id = user.university_department_id;
  }
  db.tasks.save(req.data, cbs.doNext(req, function (task) {
    notifyClientsAboutTaskUpdate(req, req.data.id ? 'tasks:update' : 'tasks:insert', task);
    req.io.respond(task);
  }));
};

exports.close = function (req) {
  db.tasks.close(req.data.taskId, req.handshake.user.id, cbs.doNext(req, function (task) {
    notifyClientsAboutTaskUpdate(req, 'tasks:update', task);
    req.io.respond(task);
  }));
};

exports.remove = function (req) {
  db.tasks.remove(req.data.taskId, cbs.doNext(req, function (task) {
    notifyClientsAboutTaskUpdate(req, 'tasks:remove', task);
    req.io.respond({ ok: true });
  }));
};

exports['get helpers'] = function (req) {
  db.tasks.getHelpers(req.data.taskIds, cbs.respond(req));
};

exports['add helper'] = function (req) {
  db.tasks.addHelper(req.data.taskId, req.data.helperId, cbs.doNext(req, function () {
    notifyClientsAboutHelpersChange(req, 'tasks:add helper', req.data.taskId, req.data.helperId);
    req.io.respond({ ok: true });
  }));
};

exports['remove helper'] = function (req) {
  db.tasks.removeHelper(req.data.taskId, req.data.helperId, cbs.respond(req, function () {
    notifyClientsAboutHelpersChange(req, 'tasks:remove helper', req.data.taskId, req.data.helperId);
    req.io.respond({ ok: true });
  }));
};

function notifyClientsAboutTaskUpdate(req, event, task, data) {
  req.io.room('tasks_ud' + task.university_department_id).broadcast(event, data || task);
  if (task.subdepartment_id) {
    // FIXME: handle subdepartment change
    req.io.room('tasks_sd' + task.subdepartment_id).broadcast(event, data || task);
  }
  req.io.room('tasks_dc').broadcast(event, data || task);
}

function notifyClientsAboutHelpersChange(req, event, taskId, helperId) {
  db.tasks.retrieve.forDepartmentChief(0, 1, undefined, { id: taskId }, cbs.doNext(req, function (tasks) {
    var task = tasks[0];
    notifyClientsAboutTaskUpdate(req, event, task, { task_id: taskId, helper_id: helperId });
    req.io.room('tasks_h' + helperId).broadcast(event, task);
  }));
}