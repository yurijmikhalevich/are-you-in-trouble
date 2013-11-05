/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var db = require('../lib/database');

exports.retrieve = function (req) {
  db.registries.retrieve('task_type', function (err, subdepartments) {
    if (err) {
      req.io.emit('err', err.toString());
    } else {
      req.io.respond(subdepartments);
    }
  });
};

exports.save = function (req) {
  db.registries.save('task_type', req.data, function (err, id) {
    if (err) {
      req.io.emit('err', err.toString());
    } else {
      req.io.respond(id);
    }
  });
};