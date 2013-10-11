/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var auth = require('../lib/auth');

exports.register = function (req, res) {
  console.log(req.user);
  auth.register(req.models, req.query.username, req.query.password, req.query.role, function (err, user) {
    res.json(user);
  });
};