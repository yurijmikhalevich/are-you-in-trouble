/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var logger = require('winston')
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
    user.fetch({ withRelated: [ 'universityDepartment' ] }).then(function (user) {
      user.related('universityDepartment').createdTasks().offset(offset).limit(limit).fetch(function (tasks) {
        req.io.respond(tasks.toJSON());
      }, function (err) {
        req.io.emit('database error', err);
      });
    }, function (err) {
      req.io.emit('database error', err);
    });
  } else if (userRole === 'helper') {
    user.related('tasks').offset(offset).limit(limit).fetch().then(function (tasks) {
      req.io.respond(tasks.toJSON());
    }, function (err) {
      req.io.emit('database error', err);
    });
  } else if (userRole === 'subDepartmentChief') {
    req.io.respond('not implemented');
//    user.fetch({ withRelated: [ 'subDepartment' ] }).then(function (user) {
//      user.related('subDepartment').tasks().offset(offset)
//    })
  } else { // if (userRole === 'departmentChief'
    models.knex('task').offset(offset).limit(limit).select().exec(function (err, tasks) {
      req.io.respond([ err, tasks ]);
    });
//    new models.Task().fetch({ offset: offset, limit: limit }).then(function (tasks) {
//      req.io.respond(tasks.toJSON());
//    }, function (err) {
//      req.io.emit('database error', err);
//    });
  }
};

exports.save = function (req) {
};