/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var orm = require('orm');

module.exports = orm.express('postgres://helpdesk:12345@localhost/helpdesk?debug=true', {
  define: function (db, models, next) {
    models.Task = db.define('task', {
      title: { type: 'text' },
      body: { type: 'text' }
    });
    models.User = db.define('user', {
      name: { type: 'text' },
      email: { type: 'text' },
      ldapIdentifier: { type: 'text' },
      role: { type: 'enum', values: [ 'client', 'helper', 'subDepartmentChief', 'departmentChief' ] }
    });
    models.TaskType = db.define('taskType', {
      name: { type: 'text' },
      isUserType: { type: 'boolean' }
    });
    models.SubDepartment = db.define('subDepartment', {
      name: { type: 'text' }
    });
    models.Faculty = db.define('faculty', {
      name: { type: 'text' }
    });
    models.Chair = db.define('chair', {
      name: { type: 'text' }
    });
    models.Chair.hasOne('faculty', models.Faculty);
    models.SubDepartment.hasMany('task_type', models.TaskType);
    models.Task.hasOne('helper', models.User);
    models.SubDepartment.hasOne('chief', models.User);
    models.Task.hasOne('task_type', models.TaskType);
    db.sync(function () {
      models.Task.find(function (err, tasks) {
        console.log(tasks);
        console.log(tasks[0].title);
        tasks[0].title = 'warum';
        tasks[1].title = 32;
        tasks[0].save();
        tasks[1].save();
      });
    });
    next();
  }
});