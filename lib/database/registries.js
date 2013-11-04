/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var settings = require('cat-settings')
  , pool = require('./pool')
  , errors = require('../errors')
  , prefix = settings.database.prefix
  , entities = [ 'task_type', 'university_department', 'subdepartment' ];

/**
 * @param {string} entity
 * @param {string} [name]
 * @param {Function} cb
 */
exports.retrieve = function (entity, name, cb) {
  if (!cb) {
    cb = name;
    name = undefined;
  }
  if (entities.indexOf(entity) === -1) {
    cb(new errors.Internal('Invalid entity'), null);
  } else {
    var query = 'SELECT e.* FROM "' + prefix + entity + '" AS e'
      , placeholdersData = [];
    if (name) {
      query += ' WHERE e.name = $1';
      placeholdersData.push(name);
    }
    pool.query(query, placeholdersData, function (err, res) {
      cb(err, res ? res.rows : null);
    });
  }
};

/**
 * @param {string} entity
 * @param {Object} data
 * @param {Function} cb
 */
exports.save = function (entity, data, cb) {
  if (entities.indexOf(entity) === -1) {
    cb(new errors.Internal('Invalid entity'), null);
  } else {
    var placeholders = []
      , query;
    if (data.id) {
      query = 'UPDATE "' + prefix + entity + '" SET name = $1 ';
      placeholders.push(data.name);
      if (entity === 'task_type') {
        query += 'AND subdepartment_id = $2 ';
        placeholders.push(data.subdepartment_id);
      }
      query += 'WHERE id = $3 RETURNING *';
      placeholders.push(data.id);
    } else {
      query = 'INSERT INTO "' + prefix + entity + '" (name';
      placeholders.push(data.name);
      if (entity === 'task_type') {
        query += ', subdepartment_id) VALUES ($1, $2) RETURNING *';
        placeholders.push(data.subdepartment_id);
      } else {
        query += ') VALUES ($1) RETURNING *';
      }
    }
    pool.query(query, placeholders, function (err, res) {
      cb((err || (!res || !res.rows.length)) ? (err || new errors.Internal('Nothing to update')) : null,
        (res && res.rows.length) ? res.rows[0] : null);
    });
  }
};