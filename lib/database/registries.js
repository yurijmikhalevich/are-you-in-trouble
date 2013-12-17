/**
 * @license GPLv3
 * @author 0@39.yt (Yurij Mikhalevich)
 */

var settings = require('cat-settings'),
    pool = require('./pool'),
    routines = require('./routines'),
    errors = require('../errors'),
    prefix = settings.database.prefix,
    entities = {
      'task type': 'task_type',
      'university department': 'university_department',
      'subdepartment': 'subdepartment'
    };


/**
 * @param {string} entity
 * @param {(string|number)=} opt_name
 * @param {Function} cb
 */
exports.retrieve = function(entity, opt_name, cb) {
  if (!cb) {
    cb = opt_name;
    opt_name = undefined;
  }
  entity = entities[entity];
  if (!entity) {
    cb(new errors.Internal('Invalid entity'), null);
  } else {
    var query = 'SELECT e.* FROM "' + prefix + entity + '" AS e',
        placeholdersData = [];
    if (opt_name) {
      var typeOfName = typeof opt_name;
      if (typeOfName === 'string') {
        query += ' WHERE e.name = $1 LIMIT 1';
      } else { // if (typeOfName === 'number')
        query += ' WHERE e.id = $1 LIMIT 1';
      }
      placeholdersData.push(opt_name);
    }
    pool.query(query, placeholdersData, routines.returnAllEntities(cb));
  }
};


/**
 * @param {string} entity
 * @param {Object} data
 * @param {Function} cb
 */
exports.save = function(entity, data, cb) {
  entity = entities[entity];
  if (!entity) {
    cb(new errors.Internal('Invalid entity'), null);
  } else {
    var placeholders = [],
        query;
    if (data.id) {
      query = 'UPDATE "' + prefix + entity + '" SET name = $1 ';
      placeholders.push(data.name);
      if (entity === 'task_type') {
        query += 'AND subdepartment_id = $2 WHERE id = $3 RETURNING *';
        placeholders.push(data.subdepartmentId);
      } else {
        query += 'WHERE id = $2 RETURNING *';
      }
      placeholders.push(data.id);
    } else {
      query = 'INSERT INTO "' + prefix + entity + '" (name';
      placeholders.push(data.name);
      if (entity === 'task_type') {
        query += ', subdepartment_id) VALUES ($1, $2) RETURNING *';
        placeholders.push(data.subdepartmentId);
      } else {
        query += ') VALUES ($1) RETURNING *';
      }
    }
    pool.query(query, placeholders, routines.returnOneEntity(cb));
  }
};
