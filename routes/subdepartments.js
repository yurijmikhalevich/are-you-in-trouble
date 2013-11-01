/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var db = require('../lib/database');

exports.retrieve = function (req) {
  db.registries.retrieve('subdepartment', function (err, subdepartments) {
    if (err) {
      req.io.emit('err', err.toString());
    } else {
      req.io.respond(subdepartments);
    }
  });
};

exports.save = function (req) {
  if (req.handshake.user.role !== 'department chief') {
    req.io.emit('err', 'Unauthorized');
  } else {
    db.registries.save('subdepartment', req.data, function (err, id) {
      if (err) {
        req.io.emit('err', err.toString());
      } else {
        req.io.respond(id);
      }
    });
  }
};