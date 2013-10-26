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
    , offset = req.data.offset || 0
    , order = req.data.order
    , filters = req.data.filters;
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
    db.tasks.retrieve.forClient(user.id, offset, limit, order, filters, cb);
  } else if (user.role === 'helper') {
    db.tasks.retrieve.forHelper(user.id, offset, limit, order, filters, cb);
  } else if (user.role === 'sub department chief') {
    db.tasks.retrieve.forSubdepartmentChief(user.id, offset, limit, order, filters, cb);
  } else { // if (user.role === 'department chief'
    db.tasks.retrieve.forDepartmentChief(offset, limit, order, filters, cb);
  }
};

exports.save = function (req) {
  db.tasks.save(req.data, function (err, res) {
    if (err) {
      req.io.emit('err', err.toString());
      logger.error(err.toString(), err);
    } else {
      req.io.respond(res);
    }
  });
};