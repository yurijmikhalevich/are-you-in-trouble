/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var cbs = require('./callbacks')
  , db = require('../lib/database')
  , mailer = require('../lib/mailer');

exports.retrieve = function (req) {
  // NOTICE: there is no limit
  // TODO: if necessary, add limit and offset support
  var user = req.handshake.user;
  checkAccess(user.id, user.role, req.data.taskId, cbs.doNext(req, function (res) {
    if (res === false) {
      req.io.emit('err', 'Unauthorized');
    } else {
      db.taskComments.retrieve(req.data.taskId, cbs.doNext(req, function (comments) {
        req.io.join('task comments' + req.data.taskId);
        req.io.respond(comments);
      }));
    }
  }));
};

exports.save = function (req) {
  var user = req.handshake.user
    , event = 'task comments:update';
  if (!req.data.id) {
    event = 'task comments:insert';
    req.data.userId = user.id;
  }
  checkAccess(user.id, user.role, req.data.taskId, cbs.doNext(req, function (res) {
    if (res === false) {
      req.io.emit('err', 'Unauthorized');
    } else {
      db.taskComments.save(req.data, cbs.doNext(req, function (comment) {
        req.io.broadcast('task comments:add', { taskId: req.data.taskId });
        req.io.room('task comments' + req.data.taskId).broadcast(event, comment);
        mailer.mailUsersAboutTaskCommentUpdate(event, comment);
        req.io.respond(comment);
      }));
    }
  }));
};

exports.remove = function (req) {
  // TODO: if necessary, add notifications about comment removing
  db.taskComments.remove(req.data.commentId, cbs.doNext(req, function (comment) {
    req.io.broadcast('task comments:remove', { commentId: comment.id, taskId: comment.taskId });
    req.io.respond({ ok: true });
  }));
};

exports.unsubscribe = function (req) {
  req.io.leave('task comments' + req.data.taskId);
  req.io.respond({ ok: true });
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