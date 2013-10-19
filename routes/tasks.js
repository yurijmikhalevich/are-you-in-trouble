/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var logger = require('winston')
  , db = require('../lib/database');

exports.retrieve = function (req) {
  var user = req.handshake.user
    , limit = 50
    , offset = req.data.offset || 0;
  if (req.data.limit && req.data.limit < 50) {
    limit = req.data.limit;
  }
  function cb(err, result) {
    if (err) {
      req.io.emit('err', err.toString());
      logger.error(err.toString(), err);
    } else {
      req.io.respond(result);
    }
  }
  if (user.role === 'client') {
    db.tasks.retrieve.forClient(user.id, offset, limit, null, cb);
  } else if (user.role === 'helper') {
    db.tasks.retrieve.forHelper(user.id, offset, limit, null, cb);
  } else if (user.role === 'subDepartmentChief') {
    db.tasks.retrieve.forSubdepartmentChief(user.id, offset, limit, null, cb);
  } else { // if (user.role === 'departmentChief'
    db.tasks.retrieve.forDepartmentChief(offset, limit, null, cb);
  }
};

exports.save = function (req) {
};