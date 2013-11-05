/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

exports.Internal = function (message) {
  var error = new Error(message);
  error.name = 'InternalError';
  return error;
};