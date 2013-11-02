/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var cbs = require('./callbacks')
  , db = require('../lib/database');

exports.retrieve = function (req) {
  var user = req.handshake.user;
  checkAccess(user.id, user.role, req.data.taskId, cbs.doNext(req, function (res) {
    if (res === false) {
      req.io.emit('err', 'Unauthorized');
    } else {
      db.taskComments.retrieve(req.data.taskId, cbs.respond(req));
    }
  }));
};

exports.save = function (req) {
  var user = req.handshake.user;
  if (req.data.comment.id) {
    if (!req.data.comment.user_id) {
      req.io.emit('err', 'Invalid input data');
      return;
    }
  } else {
    req.data.comment.user_id = user.id;
  }
  checkAccess(user.id, user.role, req.data.taskId, cbs.doNext(req, function (res) {
    if (res === false) {
      req.io.emit('err', 'Unauthorized');
    } else {
      db.taskComments.save(req.data.comment, cbs.respond(req, { saved: true }));
    }
  }));
};

exports.remove = function (req) {
  db.taskComments.remove(req.data.commentId, cbs.respond(req, { removed: true }));
};

function checkAccess(userId, userRole, taskId, cb) {
  var filters = { id: taskId }
    , checkAvailability;
  if (userRole === 'client') {
    checkAvailability = function (cb) { db.tasks.retrieve.forClient(userId, 0, 1, null, filters, cb); };
  } else if (userRole === 'helper') {
    checkAvailability = function (cb) { db.tasks.retrieve.forHelper(userId, 0, 1, null, filters, cb); };
  } else if (userRole === 'subdepartment chief') {
    checkAvailability = function (cb) { db.tasks.retrieve.forSubdepartmentChief(userId, 0, 1, null, filters, cb); };
  } else { // if (userRole === 'department chief'
    checkAvailability = function (cb) { cb(null, [ { notice: 'chief department has access to all tasks' } ]); };
  }
  checkAvailability(function (err, tasks) {
    if (err) {
      cb(err, null);
    } else {
      cb(null, tasks.length ? true : false);
    }
  });
}