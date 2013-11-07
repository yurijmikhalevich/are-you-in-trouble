/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var cbs = require('./callbacks')
  , db = require('../lib/database');

exports.retrieve = function (req) {
  db.registries.retrieve('subdepartment', cbs.respond(req));
};

exports.save = function (req) {
  db.registries.save('subdepartment', req.data, cbs.respond(req));
};