/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var bcrypt = require('bcrypt');

/**
 * Accepts login, password, performs authentication and calls cb passing to it error object and user object
 *
 * @param {Object} req Request object
 * @param {String} username
 * @param {String} password
 * @param {Function} cb
 */
exports.localStrategy = function (req, username, password, cb) {
  req.models.User.find({ username: username }, 1, function (err, users) {
    if (err || !users.length) {
      cb(err ? 'database error' : 'internal error', err || 'Invalid username or password');
    } else {
      bcrypt.compare(password, users[0].password, function (err, res) {
        if (err || !res) {
          cb('internal error', err || 'Invalid username or password');
        } else {
          cb(null, users[0]);
        }
      });
    }
  });
};

/**
 * Serialize user object into session object and calls cb passing to it error object and session object
 *
 * @param {Object} user
 * @param {Function} cb
 */
exports.serializeUser = function (user, cb) {
  cb(null, user);
};

/**
 * Deserialize user session data from stored session object and calls cb
 *
 * @param {Object} user
 * @param {Function} cb
 */
exports.deserializeUser = function (user, cb) {
  cb(null, user);
};

/**
 * @param {Object} models Models object
 * @param {String} username
 * @param {String} password
 * @param {String} role
 * @param {Function} cb
 */
exports.register = function (models, username, password, role, cb) {
  bcrypt.hash(password, 8, function (err, hash) {
    if (err) {
      cb('internal error', err);
    } else {
      var user = new models.User({
        username: username,
        password: hash,
        role: role
      });
      user.save(function (err) {
        if (err) {
          cb('database error', err);
        } else {
          cb(null, user);
        }
      });
    }
  });
};