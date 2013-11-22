/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var cbs = require('./callbacks')
  , db = require('../lib/database');

exports.retrieve = function (req) {
  db.registries.retrieve('task type', cbs.respond(req));
};

exports.save = function (req) {
  db.registries.save('task type', req.data, cbs.doNext(req, function (taskType) {
    req.io.broadcast('task type:update', taskType);
    req.io.respond(taskType);
  }));
};