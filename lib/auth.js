/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var bcrypt = require('bcrypt');

/**
 * Accepts login, password, performs authentication and calls done passing to it error object and user object
 *
 * @param {Object} req Request object
 * @param {String} username
 * @param {String} password
 * @param {Function} done
 */
exports.localStrategy = function (req, username, password, done) {
  req.models.User.find({ username: username }, 1, function (err, users) {
    if (err || !users.length) {
      done(err || 'Invalid username or password', null);
    } else {
      bcrypt.compare(password, users[0].password, function (err, res) {
        if (err || !res) {
          done(err || 'Invalid username or password', null);
        } else {
          done(null, users[0]);
        }
      });
    }
  });
};

/**
 * Serialize user object into session object and calls done passing to it error object and session object
 *
 * @param {Object} user
 * @param {Function} done
 */
exports.serializeUser = function (user, done) {
  done(null, user);
};

/**
 * Deserialize user session data from stored session object and calls done
 *
 * @param {Object} user
 * @param {Function} done
 */
exports.deserializeUser = function (user, done) {
  done(null, user);
};

/**
 * @param {Object} models Models object
 * @param {String} username
 * @param {String} password
 * @param {String} role
 * @param {Function} callback
 */
exports.register = function (models, username, password, role, callback) {
  var user = new models.User({
    username: username,
    password: bcrypt.hashSync(password, 8),
    role: role
  });
  user.save();
  callback(null, user);
};