/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var Knex = require('knex')
  , Bookshelf = require('bookshelf')
  , settings = require('cat-settings')
  , async = require('async')
  , logger = require('winston')
  , auth = require('./auth');

exports.init = function () {
  var dbConfig = {
    client: 'pg',
    connection: {
      host: settings.database.host,
      port: settings.database.port,
      user: settings.database.username,
      password: settings.database.password,
      database: settings.database.basename,
      charset: 'utf8'
    }
  };
  var knex = Knex.initialize(dbConfig);
  initializeDatabase(knex, function () {
    logger.info('Database initialized');
    exports.client = Bookshelf.initialize(dbConfig);
    createModels(exports.client);
    initBaseData(function () {
      //
    });
  });
};

function initializeDatabase(client, cb) {
  client.schema.hasTable('user').then(function (exists) {
    if (exists) {
      cb();
    } else {
      async.parallel([
        function (cb) {
          client.schema.createTable('university_department', function (table) {
            table.increments('id');
            table.string('name').unique().notNullable();
            table.enu('type', [ 'faculty', 'chair' ]).notNullable();
            table.integer('parent_id').unsigned().index().references('id').inTable('university_department');
          }).then(cb);
        },
        function (cb) {
          client.schema.createTable('sub_department', function (table) {
            table.increments('id');
            table.string('name').unique().notNullable();
          }).then(function () {
              client.schema.createTable('task_type', function (table) {
                table.increments('id');
                table.string('name').unique().notNullable();
                table.boolean('is_user_type').notNullable().defaultTo(true);
                table.integer('sub_department_id').unsigned().index().references('id').inTable('sub_department');
              }).then(cb);
            });
        }
      ], function () {
        client.schema.createTable('user', function (table) {
          table.increments('id');
          table.timestamps();
          table.string('username').unique();
          table.string('password');
          table.string('email').unique();
          table.string('phone');
          table.enu('role', [ 'client', 'helper', 'subDepartmentChief', 'departmentChief' ]).notNullable();
          table.integer('university_department_id').unsigned().index().references('id')
            .inTable('university_department');
          table.integer('sub_department_id').unsigned().index().references('id').inTable('sub_department');
        }).then(function () {
            client.schema.createTable('task', function (table) {
              table.increments('id');
              table.timestamps();
              table.string('title').notNullable();
              table.text('content').notNullable();
              table.boolean('closed').notNullable().defaultTo(false);
              table.integer('type_id').unsigned().notNullable().index().references('id').inTable('task_type');
              table.integer('client_id').unsigned().index().references('id').inTable('user');
              table.integer('sub_department_id').unsigned().index().references('id').inTable('sub_department');
              table.integer('university_department_id').unsigned().notNullable().index().references('id')
                .inTable('university_department');
            }).then(function () {
                async.parallel([
                  function (cb) {
                    client.schema.createTable('task2helper', function (table) {
                      table.integer('task_id').unsigned().notNullable().index().references('id').inTable('task');
                      table.integer('helper_id').unsigned().notNullable().index().references('id').inTable('user');
                    }).then(cb);
                  },
                  function (cb) {
                    client.schema.createTable('comment', function (table) {
                      table.increments('id');
                      table.timestamps();
                      table.text('content').notNullable();
                      table.integer('task_id').unsigned().notNullable().index().references('id').inTable('task');
                    }).then(cb);
                  }
                ], function () {
                  cb();
                });
              });
          });
      });
    }
  });
}

function createModels(client) {
  exports.UniversityDepartment = client.Model.extend({
    tableName: 'university_department',
    parent: function () {
      return this.belongsTo(exports.UniversityDepartment, 'parent_id');
    },
    children: function () {
      return this.hasMany(exports.UniversityDepartment, 'parent_id');
    },
    createdTasks: function () {
      return this.hasMany(exports.Task, 'parent_id').through(exports.UniversityDepartment);
    }
  });
  exports.SubDepartment = client.Model.extend({
    tableName: 'sub_department',
    taskTypes: function () {
      return this.hasMany(exports.SubDepartment, 'sub_department_id');
    },
    tasks: function () {
      return this.hasMany(exports.Task, 'sub_department_id');
    }
  });
  exports.TaskType = client.Model.extend({
    tableName: 'task_type',
    subDepartment: function () {
      return this.belongsTo(exports.SubDepartment, 'sub_department_id');
    },
    tasks: function () {
      return this.hasMany(exports.Task, 'type_id');
    }
  });
  exports.User = client.Model.extend({
    tableName: 'user',
    hasTimestamps: [ 'createdAt', 'updatedAt' ],
    universityDepartment: function () {
      return this.belongsTo(exports.UniversityDepartment, 'university_department_id');
    },
    subDepartment: function () {
      return this.belongsTo(exports.SubDepartment, 'sub_department_id');
    },
    tasks: function () {
      return this.belongsToMany(exports.Task, 'task2helper', 'helper_id', 'task_id');
    },
    createdTasks: function () {
      return this.hasMany(exports.Task, 'client_id');
    }
  });
  exports.Task = client.Model.extend({
    tableName: 'task',
    hasTimestamps: [ 'createdAt', 'updatedAt' ],
    type: function () {
      return this.belongsTo(exports.TaskType, 'type_id');
    },
    client: function () {
      return this.belongsTo(exports.User, 'client_id');
    },
    subDepartment: function () {
      return this.belongsTo(exports.SubDepartment, 'sub_department_id');
    },
    universityDepartment: function () {
      return this.belongsTo(exports.UniversityDepartment, 'university_department_id');
    },
    helpers: function () {
      return this.belongsToMany(exports.User, 'task2helper', 'task_id', 'helper_id');
    },
    comments: function () {
      return this.hasMany(exports.Comment, 'task_id');
    }
  });
  exports.Comment = client.Model.extend({
    tableName: 'comment',
    hasTimestamps: [ 'createdAt', 'updatedAt' ],
    task: function () {
      return this.belongsTo(exports.Task, 'task_id');
    }
  });
}

function initBaseData(cb) {
  new exports.User({ email: 'kramer.a@kubsau.ru' }).fetch().then(function (user) {
    if (user.length) {
      cb();
    }
  });
//  models.User.find(function (err, users) {
//    if (err) {
//      cb(err, null);
//    }
//    if (!users.length) {
//      async.map([
//        [ 'kramer.a', process.env.NODE_ENV === 'production' ? '' : '12345', 'kramer.a@kubsau.ru', 'departmentChief' ],
//        [ 'testClient', '123', '', 'client' ]
//      ], createUser, function (err, users) {
//        if (err) {
//          cb(err, null);
//        } else {
//          async.waterfall([
//            function (cb) {
//              var faculty = new models.UniversityDepartment({ name: 'ФПИ', type: 'faculty' });
//              faculty.save(cb)
//            },
//            function (faculty, cb) {
//              users[1].setUniversityDepartment(faculty, cb);
//            }
//          ], function (err) {
//            cb(err, users);
//          });
//          var chairs = [];
//          chairs[0] = new models.UniversityDepartment({ name: 'ИТ', type: 'chair' });
//          chairs[1] = new models.UniversityDepartment({ name: 'КЦТ', type: 'chair' });
//          chairs[2] = new models.UniversityDepartment({ name: 'КСТ', type: 'chair' });
//          chairs[0].setParent(faculty, function (err) { logger.debug(err); });
//          chairs[1].setParent(faculty, function (err) { logger.debug(err); });
//          chairs[2].setParent(faculty, function (err) { logger.debug(err); });
//          var tasks = [];
//          tasks[0] = new models.Task({ title: 'Заголовок 0', content: 'Тело заявки 0', timestamp: new Date() });
//          tasks[1] = new models.Task({ title: 'Заголовок 1', content: 'Тело заявки 1', timestamp: new Date() });
//          tasks[2] = new models.Task({ title: 'Заголовок 2', content: 'Тело заявки 2', timestamp: new Date() });
//          tasks[3] = new models.Task({ title: 'Заголовок 3', content: 'Тело заявки 3', timestamp: new Date() });
//          tasks[4] = new models.Task({ title: 'Заголовок 4', content: 'Тело заявки 4', timestamp: new Date() });
//          tasks[5] = new models.Task({ title: 'Заголовок 5', content: 'Тело заявки 5', timestamp: new Date() });
//          tasks[0].setUniversityDepartment(chairs[0], function (err) { logger.debug(err); });
//          tasks[1].setUniversityDepartment(chairs[0], function (err) { logger.debug(err); });
//          tasks[2].setUniversityDepartment(chairs[1], function (err) { logger.debug(err); });
//          tasks[3].setUniversityDepartment(chairs[2], function (err) { logger.debug(err); });
//          tasks[4].setUniversityDepartment(chairs[1], function (err) { logger.debug(err); });
//          tasks[5].setUniversityDepartment(faculty, function (err) { logger.debug(err); });
//          cb(null, users);
//        }
//      });
//    }
//  });
}

function createUser(params, cb) {
  auth.createUser(params[0], params[1], params[2], params[3], cb);
}