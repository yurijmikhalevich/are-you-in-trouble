/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var settings = require('cat-settings')
  , pool = require('./pool')
  , errors = require('../errors')
  , prefix = settings.database.prefix;

/**
 * Retrieves tasks list.
 *
 * Users of any role can filter tasks by <<closed>>, <<client>>, <<taskType>> and <<timestamp>> fields.
 *
 * Method behavior are different for users of different roles:
 * 1. departmentChief - retrieves all tasks. Can additionally filter them by subDepartment, universityDepartment and
 * helpers.
 * 2. subDepartmentChief - retrieves tasks only for his subDepartment. Can additionally filter them by
 * universityDepartment and helpers.
 * 3. helper - retrieves tasks, which he should solve. Can additionally filter them by universityDepartment.
 * 4. client - retrieves tasks, which related to his universityDepartment..
 *
 * @param req Express.io request object
 */
exports.retrieve = {};

exports.retrieve.forClient = function (clientId, offset, limit, order, filters, cb) {
  pool.query('SELECT t.* FROM "' + prefix + 'task" AS t, "' + prefix + 'user" AS u ' +
    'WHERE u.id = $1 AND u.university_department_id = t.university_department_id OFFSET $2 LIMIT $3',
    [ clientId, offset, limit ], function (err, res) {
      cb(err, res.rows);
    });
};

exports.retrieve.forHelper = function (helperId, offset, limit, order, filters, cb) {
  pool.query('SELECT t.* FROM "' + prefix + 'task" AS t, "' + prefix + 'task2helper" AS t2h ' +
    'WHERE t2h.helper_id = $1 AND t2h.task_id = t.id OFFSET $2 LIMIT $3',
    [ helperId, offset, limit ], function (err, res) {
      cb(err, res.rows);
    });
};

exports.retrieve.forSubdepartmentChief = function (subdepartmentChiefId, offset, limit, order, filters, cb) {
  pool.query('SELECT t.* FROM "' + prefix + 'task" AS t, "' + prefix + 'user" AS u ' +
    'WHERE u.id = $1 AND u.subdepartment_id = t.subdepartment_id OFFSET $2 LIMIT $3',
    [ subdepartmentChiefId, offset, limit ], function (err, res) {
      cb(err, res.rows);
    });
};

exports.retrieve.forDepartmentChief = function (offset, limit, order, filters, cb) {
  pool.query('SELECT * FROM "' + prefix + 'task" OFFSET $1 LIMIT $2', [ offset, limit ], function (err, res) {
    cb(err, res.rows);
  });
};

exports.save = function (task, cb) {
  if (task.id) {
    pool.query('UPDATE "' + prefix + 'task" SET updated_at = $1, content = $2, type_id = $3, client_id = $4, ' +
      'university_department_id = $5, subdepartment_id = $6 WHERE id = $7', [ new Date(), task.content, task.type_id,
      task.client_id, task.university_department_id, task.subdepartment_id, task.id ], function (err, res) {
        if (err || !res.rowCount) {
          cb(err || new errors.Internal('There is no task with id ' + taskId), null);
        } else {
          cb(null, { ok: true });
        }
    });
  } else {
    pool.query('INSERT INTO "' + prefix + 'task" (updated_at, content, type_id, client_id, university_department_id, ' +
      'subdepartment_id) VALUES ($1, $2, $3, $4, $5, $6)',
      [ new Date(), task.content, task.type_id, task.client_id, task.university_department_id, task.subdepartment_id ],
      function (err, res) {
        if (err || !res.rowCount) {
          cb(err || new errors.Internal(), null);
        } else {
          cb(err, { ok: true });
        }
      });
  }
};

exports.close = function (taskId, closedById, cb) {
  pool.query('UPDATE "' + prefix + 'task" SET closed_by_id = $1, updated_at = $2 WHERE id = $3',
    [ closedById, new Date(), taskId ], function (err, res) {
      if (err || !res.rowCount) {
        cb(err || new errors.Internal('There is no task with id ' + taskId), null);
      } else {
        cb(null, { ok: true });
      }
    })
};