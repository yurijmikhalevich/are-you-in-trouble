/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var bcrypt = require('bcrypt')
  , logger = require('winston')
  , callbacks = require('./callbacks')
  , models = require('./models');

/**
 * Accepts login, password, performs authentication and calls cb passing to it error object and user object
 *
 * @param {String} username
 * @param {String} password
 * @param {Function} cb
 */
exports.localStrategy = function (username, password, cb) {
  new models.User({ username: username }).fetch().then(function (user) {
      if (!user) {
        cb('internal error', 'Invalid username or password');
      } else {
        var passwordHash = user.get('password').toString();
        if (!passwordHash.length) {
          cb('internal error', 'The user is not allowed to authenticate in this way');
        } else {
          bcrypt.compare(password, passwordHash, function (err, res) {
            if (err || !res) {
              cb('internal error', err || 'Invalid username or password');
            } else {
              cb(null, user);
            }
          });
        }
      }
    }, function (err) {
      cb('database error', err);
    });
};

exports.ldapStrategy = function (user, cb) {
  new models.User({ email: user.mail }).fetch().then(function (user) {
    if (!user) {
      // TODO: create user
      cb('internal error', 'User creation not implemented');
    } else {
      cb(null, user);
    }
  }, function (err) {
    cb('database error', err);
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
  new models.User({ id: userId }).fetch().then(function (user) {
    if (!user) {
      cb('internal error');
    } else {
      cb(null, user);
    }
  }, function (err) {
    cb('database error', err);
  });
};

/**
 * User creating method. For internal purposes
 *
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
      new models.User({
        username: username,
        password: hash,
        email: email,
        role: role
      }).save().then(function (user) {
          logger.debug('User created successfully', user);
          cb(null, user);
        }, function (err) {
          logger.debug('An error occurred when creating a user', err);
          cb('database error', err);
        });
    }
  });
};