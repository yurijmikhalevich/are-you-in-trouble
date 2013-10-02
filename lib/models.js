/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var orm = require('orm')
  , settings = require('cat-settings');

module.exports = orm.express('postgres://'
  + settings.database.username + ':'
  + settings.database.password + '@'
  + settings.database.host + ':'
  + settings.database.port + '/'
  + settings.database.basename + '?debug=' + settings.debug,
  {
    define: function (db, models, next) {
      // defining Faculty model
      models.Faculty = db.define('faculty', {
        name: { type: 'text' }
      });
      // defining Chair model
      models.Chair = db.define('chair', {
        name: { type: 'text' }
      });
      models.Chair.hasOne('faculty', models.Faculty, { reverse: 'faculties' });
      // defining User model
      models.User = db.define('user', {
        username: { type: 'text' },
        password: { type: 'text' },
        email: { type: 'text' },
        ldapIdentifier: { type: 'text' },
        role: { type: 'enum', values: [ 'client', 'helper', 'subDepartmentChief', 'departmentChief' ] }
      });
      models.User.hasOne('chair', models.Chair, { reverse: 'clients' });
      // defining SubDepartment model
      models.SubDepartment = db.define('subDepartment', {
        name: { type: 'text' }
      });
      models.SubDepartment.hasOne('chief', models.User, { reverse: 'headedSubDepartments' });
      models.SubDepartment.hasMany('helpers', models.User, { reverse: 'subDepartments' });
      // defining TaskType model
      models.TaskType = db.define('taskType', {
        name: { type: 'text' },
        isUserType: { type: 'boolean' }
      });
      models.TaskType.hasOne('subDepartment', models.SubDepartment, { reverse: 'taskTypes' });
      // defining Task model
      models.Task = db.define('task', {
        title: { type: 'text' },
        body: { type: 'text' }
      });
      models.Task.hasOne('helper', models.User, { reverse: 'tasks' });
      models.Task.hasOne('taskType', models.TaskType, { reverse: 'tasks' });
      models.Task.hasOne('client', models.User, { reverse: 'createdTasks' });
      db.sync(next);
    }
  }
);