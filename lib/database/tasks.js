/**
 * Copyright (C) 2013 CAT, LLC; Yurij Mikhalevich
 * @author: Yurij Mikhalevich <0@39.yt>
 */

var Knex = require('knex');

exports.forUniversityDepartment = function (universityDepartmentId, offset, limit, callback) {
  Knex.knex('university_department').where({ parent_id: universityDepartmentId }).select('id')
    .exec(function (err, universityDepartments) {
      if (err) {
        callback(err, null);
      } else {
        var array = [];
        universityDepartments.forEach(function (universityDepartment) {
          array.push(universityDepartment.id);
        });
        array.push(universityDepartmentId);
        knex('task').whereIn('university_department_id', array).offset(offset).limit(limit).select()
          .exec(callback);
      }
    });
};