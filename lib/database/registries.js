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

exports.retrieve = function (entity, cb) {
  if (entities.indexOf(entity) === -1) {
    cb(new errors.Internal('Invalid entity'), null);
  } else {
    pool.query('SELECT e.* FROM "' + prefix + entity + '" AS e', function (err, res) {
      cb(err, res ? res.rows : null);
    });
  }
};

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
      query += 'WHERE id = $3 RETURNING id';
      placeholders.push(data.id);
    } else {
      query = 'INSERT INTO "' + prefix + entity + '" (name';
      placeholders.push(data.name);
      if (entity === 'task_type') {
        query += ', subdepartment_id) VALUES ($1, $2) RETURNING id';
        placeholders.push(data.subdepartment_id);
      } else {
        query += ') VALUES ($1) RETURNING id';
      }
    }
    pool.query(query, placeholders, function (err, res) {
      cb((err || (!res || !res.rows.length)) ? (err || new errors.Internal('Nothing to update')) : null,
        (res && res.rows.length) ? res.rows[0] : null);
    });
  }
};