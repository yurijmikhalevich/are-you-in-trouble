/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var logger = require('winston');

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
 * 4. client - retrieves tasks, which related to him universityDepartment. If universityDepartment has
 *
 * @param req Express.io request object
 */
exports.get = function (req) {
  var user = req.handshake.user;
  if (user.role === 'client') {
    user.getUniversityDepartment().getChildren().getTasks().order('timestamp').run(function (err, tasks) {
      logger.debug(err, tasks);
      req.io.respond(tasks);
    });
  }
};

exports.post = function (req) {
};

exports.update = function (req) {
};