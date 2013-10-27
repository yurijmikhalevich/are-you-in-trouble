/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var async = require('async')
  , settings = require('cat-settings')
  , pool = require('./pool')
  , auth = require('../auth')
  , prefix = settings.database.prefix;

module.exports = function (cb) {
  pool.query('SELECT relname FROM pg_class WHERE relname = $1', [ prefix + 'user' ], function (err, res) {
    if (err) {
      cb(err, null);
    } else {
      if (res.rowCount === 1) {
        cb(null, { ok: true });
      } else {
        initializeDatabase(cb);
      }
    }
  });
};

function initializeDatabase(cb) {
  var tableQueries = [
    'CREATE TYPE "' + prefix + 'user_role" ' +
      'AS ENUM (\'client\', \'helper\', \'subdepartment chief\', \'department chief\');' +
      'CREATE TABLE "' + prefix + 'user" (' +
      'id SERIAL PRIMARY KEY,' +
      'created_at TIMESTAMP NOT NULL,' +
      'updated_at TIMESTAMP NOT NULL,' +
      'username VARCHAR(60) UNIQUE,' +
      'password VARCHAR(60),' +
      'email VARCHAR(255) UNIQUE,' +
      'phone VARCHAR(15),' +
      'role ' + prefix + 'user_role NOT NULL,' +
      'university_department_id INT,' +
      'subdepartment_id INT' +
      ');',
    'CREATE TABLE "' + prefix + 'university_department" (' +
      'id SERIAL PRIMARY KEY,' +
      'name VARCHAR(60) UNIQUE NOT NULL' +
      ');',
    'CREATE TABLE "' + prefix + 'subdepartment" (' +
      'id SERIAL PRIMARY KEY,' +
      'name VARCHAR(60) UNIQUE NOT NULL' +
      ');',
    'CREATE TABLE "' + prefix + 'task" (' +
      'id SERIAL PRIMARY KEY,' +
      'created_at TIMESTAMP NOT NULL,' +
      'updated_at TIMESTAMP NOT NULL,' +
      'content TEXT NOT NULL,' +
      'closed_by_id INT,' +
      'type_id INT NOT NULL,' +
      'client_id INT,' +
      'university_department_id INT NOT NULL,' +
      'subdepartment_id INT' +
      ');',
    'CREATE TABLE "' + prefix + 'task_type" (' +
      'id SERIAL PRIMARY KEY,' +
      'name VARCHAR(60) UNIQUE NOT NULL,' +
      'subdepartment_id INT' +
      ');',
    'CREATE TABLE "' + prefix + 'task2helper" (' +
      'task_id INT NOT NULL,' +
      'helper_id INT NOT NULL' +
      ');',
    'CREATE TABLE "' + prefix + 'task_comment" (' +
      'id SERIAL PRIMARY KEY,' +
      'created_at TIMESTAMP NOT NULL,' +
      'updated_at TIMESTAMP NOT NULL,' +
      'content TEXT NOT NULL,' +
      'task_id INT NOT NULL' +
      ');'
  ];
  var constraintsQueries = [
    'ALTER TABLE "' + prefix + 'user" ADD CONSTRAINT user2university_department ' +
      'FOREIGN KEY (university_department_id) REFERENCES "' + prefix + 'university_department" (id);' +
      'ALTER TABLE "' + prefix + 'user" ADD CONSTRAINT user2subdepartment FOREIGN KEY (subdepartment_id) ' +
      'REFERENCES "' + prefix + 'subdepartment" (id);',
    'ALTER TABLE "' + prefix + 'task" ADD CONSTRAINT task2type FOREIGN KEY (type_id) ' +
      'REFERENCES "' + prefix + 'task_type" (id);' +
      'ALTER TABLE "' + prefix + 'task" ADD CONSTRAINT task2client FOREIGN KEY (client_id) ' +
      'REFERENCES "' + prefix + 'user" (id);' +
      'ALTER TABLE "' + prefix + 'task" ADD CONSTRAINT task2university_department ' +
      'FOREIGN KEY (university_department_id) REFERENCES "' + prefix + 'university_department" (id);' +
      'ALTER TABLE "' + prefix + 'task" ADD CONSTRAINT task2subdepartment FOREIGN KEY (subdepartment_id) ' +
      'REFERENCES "' + prefix + 'subdepartment" (id);',
    'ALTER TABLE "' + prefix + 'task_type" ADD CONSTRAINT task_type2subdepartment FOREIGN KEY (subdepartment_id) ' +
      'REFERENCES "' + prefix + 'subdepartment" (id);',
    'ALTER TABLE "' + prefix + 'task2helper" ADD CONSTRAINT task2helper2task FOREIGN KEY (task_id) ' +
      'REFERENCES "' + prefix + 'task" (id);' +
      'ALTER TABLE "' + prefix + 'task2helper" ADD CONSTRAINT task2helper2user FOREIGN KEY (helper_id) ' +
      'REFERENCES "' + prefix + 'user" (id);',
    'ALTER TABLE "' + prefix + 'task_comment" ADD CONSTRAINT task_comment2task FOREIGN KEY (task_id) ' +
      'REFERENCES "' + prefix + 'task" (id);'
  ];
  async.series([
    function (cb) { async.map(tableQueries, function (query, cb) { pool.query(query, cb); }, cb); },
    function (cb) { async.map(constraintsQueries, function (query, cb) { pool.query(query, cb); }, cb); },
    function (cb) { auth.createUser('kramer.a', '123', 'kramer.a@kubsau.ru', 'department chief', null, cb); }
  ], function (err, results) {
    if (err) {
      cb(err, null);
    } else if (process.env.NODE_ENV === 'production') {
      cb(null, results);
    } else {
      fillDatabaseWithTestData(cb);
    }
  });
}

function fillDatabaseWithTestData(cb) {
  var userData = [
    { username: 'subdepchief', password: '123', email: 'subdeb@kubsau.ru', role: 'subdepartment chief' }
  ];
  async.map(userData, registerUser, function (err, res) { console.log(res); cb(err, res); });
}

function registerUser(userData, cb) {
  auth.createUser(userData.username, userData.password, userData.email, userData.role, userData.universityDepartmentId,
    cb);
}