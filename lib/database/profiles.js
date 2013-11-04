/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var settings = require('cat-settings')
  , logger = require('winston')
  , pool = require('./pool')
  , routines = require('./routines')
  , errors = require('../errors')
  , prefix = settings.database.prefix
  , defaultOrder = [
    { column: 'displayname', direction: 'ASC' }
  ]
  , defaultFilters = {};

exports.retrieve = function (offset, limit, order, filters, cb) {
  var placeholdersData = []
    , query = 'SELECT u.id, u.created_at, u.updated_at, u.displayname, u.email, u.phone, u.role,' +
    // select all fields, except username and password (needed for local auth) and useless in production
    'u.university_department_id, u.subdepartment_id FROM "' + prefix + 'user" AS u ';
  var compiledFilters = routes.compileFilters((filters && Object.keys(filters).length) ? filters: defaultFilters, 'u',
    0)
    , counter = compiledFilters.counter;
  if (compiledFilters.compiled.length) {
    query += 'WHERE ' + compiledFilters.compiled;
    Array.prototype.push.apply(placeholdersData, compiledFilters.placeholdersData);
  }
  query += ' ' + routines.compileOrder((order && order.length) ? order : defaultOrder, 'u');
  query += ' OFFSET $' + (++counter) + ' LIMIT $' + (++counter);
  Array.prototype.push.apply(placeholdersData, [ offset, limit ]);
  logger.debug('Executing query %s, with placeholders %s', query, placeholdersData.join(', '));
  pool.query(query, placeholdersData, function (err, res) {
    cb(err, res ? res.rows : null);
  });
};

exports.save = function (profile, cb) {
  if (profile.id) {
    pool.query('UPDATE "' + prefix + 'user" SET updated_at = $1, displayname = $2, phone = $3 WHERE id = $4 ' +
      'RETURNING id', [ new Date(), profile.displayname, profile.phone, profile.id ], function (err, res) {
        if (err || !res.rowCount) {
          cb(err || new errors.Internal('There is no user with id ' + profile.id), null);
        } else {
          cb(null, res.rows[0]);
        }
      });
  } else {
    pool.query('INSERT INTO "' + prefix + 'user" (created_at, updated_at, displayname, email, phone, role,' +
      'university_department_id, subdepartment_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id', [ new Date(),
      new Date(), profile.displayname, profile.email, profile.phone, profile.role, profile.university_department_id,
      profile.subdepartment_id ], function (err, res) {
        if (err || !res.rowCount) {
          cb(err || new errors.Internal(), null);
        } else {
          cb(null, res.rows[0]);
        }
      });
  }
};

exports.remove = function (profileId, cb) {
  pool.query('DELETE FROM "' + prefix + 'user" WHERE id = $1', [ profileId ], cb);
};

exports.setRole = function (userId, role, cb) {
  pool.query('UPDATE "' + prefix + 'user" SET role = $1 WHERE id = $2', [ role, userId ], cb);
};

exports.setSubdepartment = function (userId, subdepartmentId, cb) {
  pool.query('UPDATE "' + prefix + 'user" SET subdepartment_id = $1 WHERE id = $2', [ subdepartmentId, userId ], cb);
};

exports.setUniversityDepartment = function (userId, universityDepartmentId, cb) {
  pool.query('UPDATE "' + prefix + 'user" SET university_department_id = $1 WHERE id = $2',
    [ universityDepartmentId, userId ], cb);
};