/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var orm = require('orm')
  , settings = require('cat-settings')
  , async = require('async')
  , logger = require('winston')
  , auth = require('./auth');

module.exports = orm.express({
    protocol: 'postgres',
    host: settings.database.host,
    port: settings.database.port,
    user: settings.database.username,
    password: settings.database.password,
    database: settings.database.basename,
    query: { debug: process.env.NODE_ENV !== 'production' }
  }, {
    define: function (db, models, next) {
      // defining University department
      models.UniversityDepartment = db.define('university_department', {
        name: { type: 'text', required: true },
        type: { type: 'enum', values: [ 'faculty', 'chair' ], required: true }
      });
      models.UniversityDepartment.hasOne('parent', models.UniversityDepartment, { reverse: 'children' });
      // defining SubDepartment model
      models.SubDepartment = db.define('sub_department', {
        name: { type: 'text', unique: true, required: true }
      });
      // defining User model
      models.User = db.define('user', {
        username: { type: 'text' },
        password: { type: 'text' },
        email: { type: 'text' },
        phone: { type: 'text' },
        role: { type: 'enum', values: [ 'client', 'helper', 'subDepartmentChief', 'departmentChief' ], required: true }
      });
      models.User.hasOne('universityDepartment', models.UniversityDepartment, { reverse: 'clients' });
      models.User.hasOne('subDepartment', models.SubDepartment, { reverse: 'helpers' });
      // defining TaskType model
      models.TaskType = db.define('task_type', {
        name: { type: 'text', required: true },
        isUserType: { type: 'boolean', defaultValue: true, required: true }
      });
      models.TaskType.hasOne('subDepartment', models.SubDepartment, { reverse: 'taskTypes' });
      // defining Task model
      models.Task = db.define('task', {
        title: { type: 'text', required: true },
        content: { type: 'text', required: true },
        timestamp: { type: 'date', time: true, required: true },
        closed: { type: 'boolean', defaultValue: false, required: true }
      });
      models.Task.hasMany('helpers', models.User, {}, { reverse: 'tasks' });
      models.Task.hasOne('taskType', models.TaskType, { reverse: 'tasks' });
      models.Task.hasOne('client', models.User, { reverse: 'createdTasks' });
      models.Task.hasOne('universityDepartment', models.UniversityDepartment, { reverse: 'tasks' });
      // defining Task comments
      models.Comment = db.define('comment', {
        content: { type: 'text', required: true },
        timestamp: { type: 'date', time: true, required: true }
      });
      models.Comment.hasOne('task', models.Task, { reverse: 'comments' });
      db.sync(function () {
        initBaseData(models, function (err) {
          if (err) {
            throw err;
          } else {
            next();
          }
        });
      });
    }
  }
);

function initBaseData(models, cb) {
  auth.User = models.User;
  models.User.find(function (err, users) {
    if (err) {
      cb(err, null);
    }
    if (!users.length) {
      async.map([
        [ 'kramer.a', process.env.NODE_ENV === 'production' ? '' : '12345', 'kramer.a@kubsau.ru', 'departmentChief' ],
        [ 'testClient', '123', '', 'client' ]
      ], createUser, function (err, users) {
        if (err) {
          cb(err, null);
        } else {
          async.waterfall([
            function (cb) {
              var faculty = new models.UniversityDepartment({ name: 'ФПИ', type: 'faculty' });
              faculty.save(cb)
            },
            function (faculty, cb) {
              users[1].setUniversityDepartment(faculty, cb);
            }
          ], function (err) {
            cb(err, users);
          });
          var chairs = [];
          chairs[0] = new models.UniversityDepartment({ name: 'ИТ', type: 'chair' });
          chairs[1] = new models.UniversityDepartment({ name: 'КЦТ', type: 'chair' });
          chairs[2] = new models.UniversityDepartment({ name: 'КСТ', type: 'chair' });
          chairs[0].setParent(faculty, function (err) { logger.debug(err); });
          chairs[1].setParent(faculty, function (err) { logger.debug(err); });
          chairs[2].setParent(faculty, function (err) { logger.debug(err); });
          var tasks = [];
          tasks[0] = new models.Task({ title: 'Заголовок 0', content: 'Тело заявки 0', timestamp: new Date() });
          tasks[1] = new models.Task({ title: 'Заголовок 1', content: 'Тело заявки 1', timestamp: new Date() });
          tasks[2] = new models.Task({ title: 'Заголовок 2', content: 'Тело заявки 2', timestamp: new Date() });
          tasks[3] = new models.Task({ title: 'Заголовок 3', content: 'Тело заявки 3', timestamp: new Date() });
          tasks[4] = new models.Task({ title: 'Заголовок 4', content: 'Тело заявки 4', timestamp: new Date() });
          tasks[5] = new models.Task({ title: 'Заголовок 5', content: 'Тело заявки 5', timestamp: new Date() });
          tasks[0].setUniversityDepartment(chairs[0], function (err) { logger.debug(err); });
          tasks[1].setUniversityDepartment(chairs[0], function (err) { logger.debug(err); });
          tasks[2].setUniversityDepartment(chairs[1], function (err) { logger.debug(err); });
          tasks[3].setUniversityDepartment(chairs[2], function (err) { logger.debug(err); });
          tasks[4].setUniversityDepartment(chairs[1], function (err) { logger.debug(err); });
          tasks[5].setUniversityDepartment(faculty, function (err) { logger.debug(err); });
          cb(null, users);
        }
      });
    }
  });
}

function createUser(params, cb) {
  auth.createUser(params[0], params[1], params[2], params[3], cb);
}