/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var bcrypt = require('bcrypt')
  , settings = require('cat-settings')
  , async = require('async')
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
  db.profiles.retrieve(0, 1, undefined, { email: user.mail }, function (err, profiles) {
    if (err) {
      cb(err, null);
    } else {
      if (!profiles.length) {
        var universityDepartmentName = getUniversityDepartmentName(user.distinguishedName);
        if (!universityDepartmentName) {
          cb(new errors.Internal('Cannot create user with undefined university department'), null);
        } else {
          async.waterfall([
            function (cb) {
              db.registries.retrieve('university department', universityDepartmentName, cb);
            }, function (departments, cb) {
              if (departments.length) {
                cb(null, departments[0]);
              } else {
                db.registries.save('university department', { name: universityDepartmentName }, cb);
              }
            }, function (department, cb) {
              db.profiles.save({
                displayName: user.displayName || user.mailNickname,
                email: user.mail,
                phone: null,
                role: 'client',
                universityDepartmentId: department.id,
                subdepartmentId: null
              }, cb);
            }
          ], cb);
        }
      } else {
        cb(null, profiles[0]);
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
  db.profiles.retrieve(0, 1, undefined, { id: userId }, function (err, profiles) {
    if (err || !profiles.length) {
      cb(err || new errors.Internal(), null);
    } else {
      cb(null, profiles[0]);
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
 * @param {Number} universityDepartmentId
 * @param {Number} subdepartmentId
 * @param {Function} cb
 */
exports.createUser = function (username, password, email, role, universityDepartmentId, subdepartmentId, cb) {
  if (universityDepartmentId) { // there is should be one - university department or subdepartment - defined
    subdepartmentId = null;
  }
  bcrypt.hash(password, 8, function (err, hash) {
    if (err) {
      cb(err, null);
    } else {
      db.query('INSERT INTO "' + prefix + 'user" (created_at, updated_at, username, password, email, role, ' +
        'university_department_id, subdepartment_id, display_name) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)' +
        'RETURNING id',
        [ new Date(), new Date(), username, hash, email, role, universityDepartmentId, subdepartmentId, username ],
        function (err, res) {
          if (err || !res.rowCount) {
            cb(err || new errors.Internal(), null);
          } else {
            cb(err, res.rows[0]);
          }
        });
    }
  });
};

/**
 * @param {string} distinguishedName
 * @returns {string|undefined}
 */
function getUniversityDepartmentName(distinguishedName) {
  var splittedDistinguishedName = distinguishedName.split(',')
    , splittedName;
  for (var i = 0; i < splittedDistinguishedName.length; ++i) {
    splittedName = splittedDistinguishedName[i].split('=');
    if (splittedName[0] === 'OU') {
      return splittedName[1];
    }
  }
  return undefined;
}