/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var bcrypt = require('bcrypt')
  , logger = require('winston')
  , settings = require('cat-settings')
  , db = require('./database')
  , errors = require('./errors')
  , prefix = settings.database.prefix;

/**
 * Accepts login, password, performs authentication and calls cb passing to it error object and user object
 *
 * @param {String} username
 * @param {String} password
 * @param {Function} cb
 */
exports.localStrategy = function (username, password, cb) {
  db.query('SELECT * FROM "' + prefix + 'user" WHERE username = $1', [ username ], function (err, res) {
    if (err || !res.rowCount) {
      cb(err || new errors.Internal('Invalid username or password'), null);
    } else {
      var user = res.rows[0];
      if (!user.password || !user.password.length) {
        cb(new errors.Internal('The user is not allowed to authenticate in this way'), null);
      } else {
        bcrypt.compare(password, user.password, function (err, res) {
          if (err || !res) {
            cb(err || new errors.Internal('Invalid username or password'), null);
          } else {
            cb(null, user);
          }
        });
      }
    }
  });
};

exports.ldapStrategy = function (user, cb) {
  db.query('SELECT * FROM "' + prefix + 'user" WHERE email = $1', [ user.email ], function (err, res) {
    if (err) {
      cb(err, null);
    } else {
      if (!res.rowCount) {
        // TODO: create user
        cb(new errors.Internal('User creation not implemented yet'), null);
      } else {
        cb(null, res.rows[0]);
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
  db.query('SELECT * FROM "' + prefix + 'user" WHERE id = $1', [ userId ], function (err, res) {
    if (err || !res.rowCount) {
      cb(err || new errors.Internal(), null);
    } else {
      cb(null, res.rows[0]);
    }
  });
};

/**
 * User creation method. For internal purposes
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
      cb(err, null);
    } else {
      db.query('INSERT INTO "' + prefix + 'user" (created_at, updated_at, username, password, email, role) ' +
        'VALUES ($1, $2, $3, $4, $5, $6)', [ new Date(), new Date(), username, hash, email, role ],
        function (err, res) {
          if (err || !res.rowCount) {
            cb(err || new errors.Internal(), null);
          } else {
            cb(err, { ok: true });
          }
        });
    }
  });
};