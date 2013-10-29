/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var logger = require('winston');

exports.respond = function (req, response) {
  return function (err, res) {
    if (err) {
      req.io.emit('err', err.toString());
      logger.error(err.toString(), err);
    } else {
      req.io.respond(response || res);
    }
  };
};

exports.doNext = function (req, cb) {
  return function (err, res) {
    if (err) {
      req.io.emit('err', err.toString());
      logger.error(err.toString(), err);
    } else {
      cb(res);
    }
  };
};