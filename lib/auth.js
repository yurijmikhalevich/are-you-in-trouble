/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var bcrypt = require('bcrypt')
  , logger = require('winston');

/**
 * Accepts login, password, performs authentication and calls cb passing to it error object and user object
 *
 * @param {String} username
 * @param {String} password
 * @param {Function} cb
 */
exports.localStrategy = function (username, password, cb) {
  exports.User.find({ username: username }, 1, function (err, users) {
    if (err || !users.length) {
      cb(err ? 'database error' : 'internal error', err || 'Invalid username or password');
    } else {
      if (!users[0].password.length) {
        cb('denied', 'The user is not allowed to authenticate in this way');
      } else {
        bcrypt.compare(password, users[0].password, function (err, res) {
          if (err || !res) {
            cb('internal error', err || 'Invalid username or password');
          } else {
            cb(null, users[0]);
          }
        });
      }
    }
  });
};

exports.ldapStrategy = function (user, cb) {
  exports.User.find({ email: user.mail }, 1, function (err, users) {
    if (err) {
      cb('database error', err);
    } else {
      if (!users.length) {
        // TODO: create user
        cb('internal error', 'User creation not implemented');
      } else {
        cb(null, users[0]);
      }
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
  cb(null, user.id);
};

/**
 * Deserialize user session data from stored session object and calls cb
 *
 * @param {Number} userId
 * @param {Function} cb
 */
exports.deserializeUser = function (userId, cb) {
  exports.User.find({ id: userId }, 1, function (err, users) {
    if (err || !users.length) {
      cb(err ? 'database error' : 'internal error', err);
    } else {
      cb(null, users[0]);
    }
  });
};

/**
 * @param {String} username
 * @param {String} password
 * @param {String} email Email addresses, used as identifier with LDAP authorization
 * @param {String} role
 * @param {Function} cb
 */
exports.createUser = function (username, password, email, role, cb) {
  bcrypt.hash(password, 8, function (err, hash) {
    if (err) {
      cb('internal error', err);
    } else {
      var user = new exports.User({
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