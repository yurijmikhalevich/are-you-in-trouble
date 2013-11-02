/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var db = require('../lib/database');

exports.retrieve = function (req) {
  db.registries.retrieve('university_department', function (err, university_departments) {
    if (err) {
      req.io.emit('err', err.toString());
    } else {
      req.io.respond(university_departments);
    }
  });
};

exports.save = function (req) {
  db.registries.save('university_department', req.data, function (err, id) {
    if (err) {
      req.io.emit('err', err.toString());
    } else {
      req.io.respond(id);
    }
  });
};