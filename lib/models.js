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
  , callbacks = require('./callbacks')
  , auth = require('./auth');

exports.init = function (cb) {
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
  exports.knex = Knex.initialize(dbConfig);
  initializeDatabase(exports.knex, function () {
    logger.info('Database initialized');
    exports.client = Bookshelf.initialize(dbConfig);
    exports.client.plugin(require('bookshelf/plugins/exec'));
    createModels(exports.client);
    initBaseData(function () {
      cb();
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
          }).then(cb, callbacks.throwAnError);
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
              }).then(cb, callbacks.throwAnError);
            }, callbacks.throwAnError);
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
                    }).then(cb, callbacks.throwAnError);
                  },
                  function (cb) {
                    client.schema.createTable('comment', function (table) {
                      table.increments('id');
                      table.timestamps();
                      table.text('content').notNullable();
                      table.integer('task_id').unsigned().notNullable().index().references('id').inTable('task');
                    }).then(cb, callbacks.throwAnError);
                  }
                ], function () {
                  cb();
                });
              }, callbacks.throwAnError);
          }, callbacks.throwAnError);
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
    hasTimestamps: [ 'created_at', 'updated_at' ],
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
    hasTimestamps: [ 'created_at', 'updated_at' ],
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
    hasTimestamps: [ 'created_at', 'updated_at' ],
    task: function () {
      return this.belongsTo(exports.Task, 'task_id');
    }
  });
}

function initBaseData(cb) {
  new exports.User({ email: 'kramer.a@kubsau.ru' }).fetch().then(function (user) {
    logger.debug(user);
    if (user) {
      cb();
    } else {
      logger.info('Initializing database with base data');
      createUser({
        username: 'kramer.a',
        password: '0',
        email: 'kramer.a@kubsau.ru',
        role: 'departmentChief'
      }, function (err) {
        if (err) {
          throw new Error(err);
        } else {
          if (process.env.NODE_ENV === 'production') {
            cb();
          } else {
            logger.info('Running in development mode on empty database');
            logger.info('Initializing database with test data');
            exports.save('UniversityDepartment', { name: 'ФПИ', type: 'faculty' }, function (err, faculty) {
              if (err) {
                throw new Error(err);
              } else {
                var facultyId = faculty.get('id');
                faculty.save({ parent_id: facultyId }, { patch: true }).then(function () {
                  async.parallel([
                    function (cb) {
                      createChairs(facultyId, cb);
                    },
                    function (cb) {
                      createSubDepartments(function (err, subDepartments) {
                        createTaskTypes(subDepartments, cb);
                      });
                    }
                  ], function (err) {
                    if (err) {
                      throw new Error(err);
                    } else {
                      cb();
                    }
                  });
                }, callbacks.throwAnError);
              }
            })
          }
        }
      });
    }
  }, callbacks.throwAnError);
}

exports.save = function (modelName, entry, cb) {
  if (entry instanceof Function) {
    cb = entry;
    entry = modelName.entry;
    modelName = modelName.modelName;
  }
  new exports[modelName](entry).save().then(function (entryObject) {
    cb(null, entryObject);
  }, function (err) {
    cb('database error', err);
  })
};

function createUser(params, cb) {
  auth.createUser(params.username, params.password, params.email, params.role, cb);
}

function createChairs(facultyId, cb) {
  async.map([
    { modelName: 'UniversityDepartment', entry: { name: 'ИС', type: 'chair', parent_id: facultyId } },
    { modelName: 'UniversityDepartment', entry: { name: 'КТС', type: 'chair', parent_id: facultyId } },
    { modelName: 'UniversityDepartment', entry: { name: 'САОИ', type: 'chair', parent_id: facultyId } },
    { modelName: 'UniversityDepartment', entry: { name: 'ЭК', type: 'chair', parent_id: facultyId } }
  ], exports.save, function (err, chairs) {
    if (err) {
      throw new Error(err);
    } else {
      cb(null, chairs);
    }
  });
}

function createSubDepartments(cb) {
  async.map([
    { modelName: 'SubDepartment', entry: { name: 'Железячники' } },
    { modelName: 'SubDepartment', entry: { name: 'ПОшники' } },
    { modelName: 'SubDepartment', entry: { name: 'Сетевики' } }
  ], exports.save, function (err, subDepartments) {
    if (err) {
      throw new Error(err);
    } else {
      cb(null, subDepartments);
    }
  });
}

function createTaskTypes(subDepartments, cb) {
  var params = [
    { modelName: 'TaskType', entry: {
      name: 'Не работает почта',
      is_user_type: false,
      sub_department_id: subDepartments[2].get('id')
    } },
    { modelName: 'TaskType', entry: {
      name: 'Не запускается программа',
      is_user_type: false,
      sub_department_id: subDepartments[1].get('id')
    } },
    { modelName: 'TaskType', entry: {
      name: 'Не включается компьютер',
      is_user_type: false,
      sub_department_id: subDepartments[0].get('id')
    } },
    { modelName: 'TaskType', entry: {
      name: 'Выключается компьютер',
      is_user_type: false,
      sub_department_id: subDepartments[0].get('id')
    } },
    { modelName: 'TaskType', entry: {
      name: 'Нет доступа к сетевому хранилищу',
      is_user_type: false,
      sub_department_id: subDepartments[2].get('id')
    } }
  ];
  async.map(params, exports.save, function (err, taskTypes) {
    if (err) {
      throw new Error(err);
    } else {
      cb(null, taskTypes);
    }
  });
}