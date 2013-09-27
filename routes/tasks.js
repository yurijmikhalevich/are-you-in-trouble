/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

exports.retrieve = function (req) {
  req.models.Task.find(function (err, tasks) {
    console.log(tasks);
    req.io.respond(tasks);
  });
};

exports.save = function (req) {
};