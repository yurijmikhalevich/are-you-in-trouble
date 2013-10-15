/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var logger = require('winston')
  , Knex = require('knex').knex
  , db = require('../lib/database')
  , models = require('../lib/models');

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
 * 4. client - retrieves tasks, which related to him universityDepartment. If universityDepartment has any children,
 * retrieves their tasks too.
 *
 * @param req Express.io request object
 */
exports.retrieve = function (req) {
  var user = req.handshake.user
    , userRole = user.get('role')
    , limit = 50
    , offset = req.data.offset || 0;
  if (req.data.limit && req.data.limit < 50) {
    limit = req.data.limit;
  }
  if (userRole === 'client') {
    db.tasks.forUniversityDepartment(user.get('university_department_id'), offset, limit, function (err, tasks) {
      if (err) {
        req.io.emit('database error', err);
      } else {
        req.io.respond(tasks);
      }
    })
  } else if (userRole === 'helper') {
    Knex.knex('task').join('task2helper', 'task2helper.task_id', '=', 'task.id')
      .where('task2helper.helper_id', user.get('id')).offset(offset).limit(limit).select('task.*')
      .exec(function (err, tasks) {
        if (err) {
          req.io.emit('database error', err);
        } else {
          req.io.respond(tasks);
        }
      });
  } else if (userRole === 'subDepartmentChief') {
    Knex.knex('task').where('sub_department_id', user.get('sub_department_id')).offset(offset).limit(limit).select()
      .exec(function (err, tasks) {
        if (err) {
          req.io.emit('database error', err);
        } else {
          req.io.respond(tasks);
        }
      });
  } else { // if (userRole === 'departmentChief'
    Knex.knex('task').offset(offset).limit(limit).exec(function (err, tasks) {
      if (err) {
        req.io.emit('database error', err);
      } else {
        req.io.respond(tasks);
      }
    });
  }
};

exports.save = function (req) {
  new models.Task(req.data).save().exec(function (err, task) {
    if (err) {
      req.io.emit('database error', err);
    } else {
      req.io.respond(task.toJSON());
    }
  });
};