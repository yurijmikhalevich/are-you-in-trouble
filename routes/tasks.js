/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

exports.retrieve = function (req) {
  if (req.handshake.user.role === 'client') {
    req.handshake.user.getCreatedTasks(function (err, tasks) {
      if (err) {
        req.io.emit('database error', err);
      } else {
        req.io.respond(tasks);
      }
    });
  } else {
    req.handshake.user.getTasks(function (err, tasks) {
      if (err) {
        req.io.emit('database error', err);
      } else {
        req.io.respond(tasks);
      }
    });
  }
};

exports.save = function (req) {
  req.handshake.user.setCreatedTasks(req.data, function (err, task) {
    console.log(err, task);
  });
};