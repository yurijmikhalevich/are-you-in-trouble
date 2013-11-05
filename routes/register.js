/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var logger = require('winston')
  , auth = require('../lib/auth');

exports.register = function (req, res) {
  console.log(req.user);
  auth.createUser(req.query.username, req.query.password, 'test@test.ch', req.query.role, null, function (err, user) {
    logger.error(err);
    res.json(user);
  });
};