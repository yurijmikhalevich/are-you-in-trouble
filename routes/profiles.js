/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

exports.retrieve = function (req) {
};

exports.save = function (req) {
};

exports.remove = function (req) {
  req.io.emit('err', 'profile:remove not yet implemented');
};

exports['set subdepartment'] = function (req) {
};

exports['set university department'] = function (req) {
};

exports['set password'] = function (req) {
};