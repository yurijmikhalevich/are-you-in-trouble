/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var models = require('../lib/models');

exports.retrieve = function (req) {
  models.Task.find(function (err, tasks) {
    console.log(tasks);
    req.io.respond(tasks);
  });
};

exports.save = function (req) {
  models.Task.create(req.data, function (err, tasks) {
    console.log(tasks);
  });
};