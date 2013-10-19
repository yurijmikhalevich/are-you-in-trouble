/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var settings = require('cat-settings')
  , pool = require('./pool')
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

exports.retrieve.forClient = function (clientId, offset, limit, filters, cb) {
  pool.query('SELECT t.* FROM "' + prefix + 'task" AS t, "' + prefix + 'user" AS u ' +
    'WHERE u.id = $1 AND u.university_department_id = t.university_department_id OFFSET $2 LIMIT $3',
    [ clientId, offset, limit ], function (err, res) {
      cb(err, res.rows);
    });
};

exports.retrieve.forHelper = function (helperId, offset, limit, filters, cb) {
  pool.query('SELECT t.* FROM "' + prefix + 'task" AS t, "' + prefix + 'task2helper" AS t2h ' +
    'WHERE t2h.helper_id = $1 AND t2h.task_id = t.id OFFSET $2 LIMIT $3',
    [ helperId, offset, limit ], function (err, res) {
      cb(err, res.rows);
    });
};

exports.retrieve.forSubdepartmentChief = function (subdepartmentChiefId, offset, limit, filters, cb) {
  pool.query('SELECT t.* FROM "' + prefix + 'task" AS t, "' + prefix + 'user" AS u ' +
    'WHERE u.id = $1 AND u.subdepartment_id = t.subdepartment_id OFFSET $2 LIMIT $3',
    [ subdepartmentChiefId, offset, limit ], function (err, res) {
      cb(err, res.rows);
    });
};

exports.retrieve.forDepartmentChief = function (offset, limit, filters, cb) {
  pool.query('SELECT * FROM "' + prefix + 'task" OFFSET $1 LIMIT $2', [ offset, limit ], function (err, res) {
    cb(err, res.rows);
  });
};