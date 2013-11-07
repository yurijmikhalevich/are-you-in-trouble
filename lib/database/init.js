/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var async = require('async')
  , settings = require('cat-settings')
  , db = require('../database')
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
  var tableAndOtherBaseStuffQueries = [
    'CREATE OR REPLACE FUNCTION "' + prefix + 'fn_array_agg_notnull" (arr ANYARRAY, el ANYELEMENT)' +
      ' RETURNS ANYARRAY' +
      ' AS $$' +
      ' BEGIN' +
      '  IF el IS NOT NULL THEN' +
      '   arr := ARRAY_APPEND(arr, el);' +
      '  END IF;' +
      '  RETURN arr;' +
      ' END;' +
      ' $$ IMMUTABLE LANGUAGE \'plpgsql\';' +
      ' CREATE AGGREGATE "' + prefix + 'array_agg_notnull" (ANYELEMENT) (' +
      // this needed because default ARRAY_AGG returns array with one NULL instead of empty ARRAY
      '  SFUNC = "' + prefix + 'fn_array_agg_notnull",' +
      '  STYPE = ANYARRAY,' +
      '  INITCOND = \'{}\'' +
      ' );',
    'CREATE TYPE "' + prefix + 'user_role" ' +
      'AS ENUM (\'client\', \'helper\', \'subdepartment chief\', \'department chief\');' +
      'CREATE TABLE "' + prefix + 'user" (' +
      'id SERIAL PRIMARY KEY,' +
      'created_at TIMESTAMP NOT NULL,' +
      'updated_at TIMESTAMP NOT NULL,' +
      'username VARCHAR(60) UNIQUE,' +
      'password VARCHAR(60),' +
      'display_name VARCHAR(80) UNIQUE NOT NULL,' +
      'email VARCHAR(255) UNIQUE NOT NULL,' + // this field is used for associating system account with LDAP account
      'phone VARCHAR(15),' +
      'role ' + prefix + 'user_role NOT NULL,' +
      'university_department_id INT,' +
      'subdepartment_id INT' +
      ');',
    'CREATE TABLE "' + prefix + 'university_department" (' +
      'id SERIAL PRIMARY KEY,' +
      'name VARCHAR(80) UNIQUE NOT NULL' + // this field is used for associating system department with LDA department
      ');',
    'CREATE TABLE "' + prefix + 'subdepartment" (' +
      'id SERIAL PRIMARY KEY,' +
      'name VARCHAR(80) UNIQUE NOT NULL' +
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
      'name VARCHAR(80) UNIQUE NOT NULL,' +
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
      'task_id INT NOT NULL,' +
      'user_id INT NOT NULL' +
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
      'REFERENCES "' + prefix + 'user" (id) ON DELETE CASCADE;' +
      'ALTER TABLE "' + prefix + 'task" ADD CONSTRAINT task2university_department ' +
      'FOREIGN KEY (university_department_id) REFERENCES "' + prefix + 'university_department" (id);' +
      'ALTER TABLE "' + prefix + 'task" ADD CONSTRAINT task2subdepartment FOREIGN KEY (subdepartment_id) ' +
      'REFERENCES "' + prefix + 'subdepartment" (id);',
    'ALTER TABLE "' + prefix + 'task_type" ADD CONSTRAINT task_type2subdepartment FOREIGN KEY (subdepartment_id) ' +
      'REFERENCES "' + prefix + 'subdepartment" (id);',
    'CREATE UNIQUE INDEX ON "' + prefix + 'task2helper" (task_id, helper_id);',
    'ALTER TABLE "' + prefix + 'task2helper" ADD CONSTRAINT task2helper2task FOREIGN KEY (task_id) ' +
      'REFERENCES "' + prefix + 'task" (id) ON DELETE CASCADE;' +
      'ALTER TABLE "' + prefix + 'task2helper" ADD CONSTRAINT task2helper2user FOREIGN KEY (helper_id) ' +
      'REFERENCES "' + prefix + 'user" (id) ON DELETE CASCADE;',
    'ALTER TABLE "' + prefix + 'task_comment" ADD CONSTRAINT task_comment2task FOREIGN KEY (task_id) ' +
      'REFERENCES "' + prefix + 'task" (id) ON DELETE CASCADE;' +
      'ALTER TABLE "' + prefix + 'task_comment" ADD CONSTRAINT task_comment2user FOREIGN KEY (user_id) ' +
      'REFERENCES "' + prefix + 'user" (id) ON DELETE CASCADE;'
  ];
  async.series([
    function (cb) { async.map(tableAndOtherBaseStuffQueries, function (query, cb) { pool.query(query, cb); }, cb); },
    function (cb) { async.map(constraintsQueries, function (query, cb) { pool.query(query, cb); }, cb); },
    function (cb) { auth.createUser('kramer.a', '123', 'kramer.a@kubsau.ru', 'department chief', null, null, cb); }
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
  var subdepartmentAndUniversityDepartmentQueries = [
    'INSERT INTO "' + prefix + 'university_department" (name) VALUES (\'ФПИ\'), (\'КСТ\'), (\'ТССА\'), (\'ТХПЖП\'), ' +
      '(\'ТХПРП\'), (\'БББ\') RETURNING id',
    'INSERT INTO "' + prefix + 'subdepartment" (name) VALUES (\'Отдел по поддержке прикладного ПО\'),' +
      '(\'Отдел по поддержке железа\'), (\'Отдел по поддержке ЛВС\') RETURNING id'
  ];
  async.map(subdepartmentAndUniversityDepartmentQueries, function (query, cb) { pool.query(query, cb); },
    function (err, ids) {
      if (err) {
        cb(err, null);
      } else {
        var userData = [
          { username: 'subdep1chief', password: '123', email: 'subdep1@kubsau.ru', role: 'subdepartment chief',
            subdepartmentId: ids[1].rows[0].id },
          { username: 'subdep2chief', password: '123', email: 'subdep2@kubsau.ru', role: 'subdepartment chief',
            subdepartmentId: ids[1].rows[1].id },
          { username: 'subdep3chief', password: '123', email: 'subdep3@kubsau.ru', role: 'subdepartment chief',
            subdepartmentId: ids[1].rows[2].id },
          { username: 'helper1', password: '123', email: 'helper1@kubsau.ru', role: 'helper',
            subdepartmentId: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id },
          { username: 'helper2', password: '123', email: 'helper2@kubsau.ru', role: 'helper',
            subdepartmentId: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id },
          { username: 'helper3', password: '123', email: 'helper3@kubsau.ru', role: 'helper',
            subdepartmentId: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id },
          { username: 'helper4', password: '123', email: 'helper4@kubsau.ru', role: 'helper',
            subdepartmentId: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id },
          { username: 'helper5', password: '123', email: 'helper5@kubsau.ru', role: 'helper',
            subdepartmentId: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id },
          { username: 'helper6', password: '123', email: 'helper6@kubsau.ru', role: 'helper',
            subdepartmentId: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id },
          { username: 'helper7', password: '123', email: 'helper7@kubsau.ru', role: 'helper',
            subdepartmentId: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id },
          { username: 'helper8', password: '123', email: 'helper8@kubsau.ru', role: 'helper',
            subdepartmentId: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id },
          { username: 'client1', password: '123', email: 'client1@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client2', password: '123', email: 'client2@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client3', password: '123', email: 'client3@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client4', password: '123', email: 'client4@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client5', password: '123', email: 'client5@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client6', password: '123', email: 'client6@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client7', password: '123', email: 'client7@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client8', password: '123', email: 'client8@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client9', password: '123', email: 'client9@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client10', password: '123', email: 'client10@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client11', password: '123', email: 'client11@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client12', password: '123', email: 'client12@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client13', password: '123', email: 'client13@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client14', password: '123', email: 'client14@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id },
          { username: 'client15', password: '123', email: 'client15@kubsau.ru', role: 'client',
            universityDepartmentId: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id }
        ];
        var taskTypeQuery =
          'INSERT INTO "' + prefix + 'task_type" (name, subdepartment_id) VALUES (\'Проблемы с сетью\', '
            + ids[1].rows[2].id + '), (\'Проблемы с компьютером\', ' + ids[1].rows[1].id + '), ' +
            '(\'Проблемы с программами\', ' + ids[1].rows[0].id + '), (\'Другие проблемы\', NULL) RETURNING id';
        async.parallel([
          function (cb) { pool.query(taskTypeQuery, cb); },
          function (cb) { async.map(userData, registerUser, cb); }
        ], function (err, res) {
          if (err) {
            cb(err, null);
          } else {
            var tasks = [
              {
                content: 'Воу-воу, всё поехало',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Всё не так уж плохо',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Сеть легла',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Шара недоступна',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Здравствуйте\n Ядро не компилируется с поддержкой RNDIS, с -O3. Что делать?',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Стоит Gentoo, собранная буквально неделю назад. Проблем я уже нахватал(можно посмотреть по ' +
                  'истории), но это всё ерунда. Тут столкнулся со странным поведением eix и layman. Суть такова:\n ' +
                  'eix-remote update получает списки не со всех репозитариев (всего с 9). Ну и ладно думаю, не надо ' +
                  'мне ничего смотреть, что поставить надо и без него знаю. Добавляю например gamerlay и пытаюсь ' +
                  'поставить steam-meta,а мне "emerge: there are no ebuilds to satisfy "steam-meta".". Так вот, в ' +
                  'layman репы добавляются без проблем, но ни eix ни portage(emerge) их не видят вовсе, хоть вручную ' +
                  'собирай. Я что-то делаю не так? Раньше по аналогичной схеме всё работало как часы, теперь чудеса.',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Пытаюсь обновить что-нибудь, например kde-meta из ~ и получаю... Что с этим делать(кроме ' +
                  'ручного даунгреда glibc)? попадались похожие записи на багзиле, но там ничего путного что делать ' +
                  'не нашел. Как я понимаю проблема в связке boost-->glibc. Что можно с этим сделать? Поясню, более ' +
                  'конкретно во избежание эксцессов: буст 1.5 стоял, но я начал готовиться к откату glibc и поэтому ' +
                  'его снес. При его установке система за одно пытается даунгрейдить и его. Вопрос состоит скорее ' +
                  'именно в том как подружить систему с новой версией буста. P.S. emerge --sync делал. Спасибо!',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Установил Gentoo. Столкнулся с проблемой, что сетевые адаптеры не стартуют при загрузке. ' +
                  'При загрузке ошибок нет, в messages тоже. В rc-update добавлено в default уровень. Если ' +
                  'запустить после загрузки вручную командой: /etc/init.d/net.eth0 start , то все запускается ' +
                  'нормально.',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Хочу проапгрейдить Macbook pro mid 2010 года. Уже установил 8 Гб оперативной памяти, ' +
                  'теперь очередь за SSD. Никак не могу определиться: использовать Fusion Drive или отдельно ' +
                  'ставить систему на SSD, а пользовательские данные на HDD оставить. SSD планирую поставить ' +
                  'Plextor PX-M5S 128 GB.',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Стоит дома старый усилок Sony с приличными колонками, к нему подцеплен проигрыватель ' +
                  'винила. Очень хочется иметь возможность на него выводить звук при просмотре фильмов, когда ' +
                  'слушаешь музыку. Т.е. с компа/телефона по bluetooth или wifi, в крайнем случае ' +
                  'ethernet/miniusb/*кабель для iphone/ipad. Иными словами превратить его в беспроводные колонки ' +
                  'к которым можно подцепиться с любых девайсов.',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Есть мониторные наушники с обрывком кабеля (4 провода: левый, правый, микрофон, земля) и ' +
                  'штекер 3,5 мм (mini jack), опять же, с обрывком. Я спаиваю их и изолирую. Проблема вот в чем — ' +
                  'когда случайно дергаешь наушники, все соединения могут крайне легко разорваться. Можете ' +
                  'предложить лайфхак, чтобы этого не происходило? Может быть, крепкий припой или закрепление ' +
                  'участка провода. Вопрос может казаться странным, но я в этом деле новичок.',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Есть идея написать браузерку для мобилок, так как владею JS и имел опыт работы с node, ' +
                  'то соответственно на ноде и думаю делать. Но если честно совсем никак не могу определиться ' +
                  'с фреймворком — слишком уж их много… Подскажите, пожалуйста. Сильно много мне не нужно, MVC да ' +
                  'рендринг страниц на сервере. Понравился этот новенький impress, но не стремлюсь использовать ' +
                  'самопальный продукт, могущий в любой момент свернуться и даже не имеющий документации… ',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Посоветуйте библиотеку C++ для работы с конфигами',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'MS SQL — возможно ли автообновление списка таблиц?',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Apache + MySQL на Windows в production — как убедить людей что это плохо',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              },
              {
                content: 'Воу-воу, всё приехало',
                type_id: res[0].rows[Math.round(Math.random() * (res[0].rows.length - 1))].id,
                client_id: Math.round(Math.random()) ? res[1][Math.round(Math.random() * 14) + 11].id : null,
                university_department_id: ids[0].rows[Math.round(Math.random() * (ids[0].rows.length - 1))].id,
                subdepartment_id: ids[1].rows[Math.round(Math.random() * (ids[1].rows.length - 1))].id
              }
            ];
            async.map(tasks, db.tasks.save, function (err, taskIds) {
              if (err) {
                cb(err, null);
              } else {
                var task2helperQuery =
                  'INSERT INTO "' + prefix + 'task2helper" (helper_id, task_id) VALUES ('
                    + res[1][Math.round(Math.random() * 7) + 3].id + ', '
                    + taskIds[Math.round(Math.random() * (taskIds.length - 1))].id + '), ' + '('
                    + res[1][Math.round(Math.random() * 7) + 3].id + ', '
                    + taskIds[Math.round(Math.random() * (taskIds.length - 1))].id + '), ' + '('
                    + res[1][Math.round(Math.random() * 7) + 3].id + ', '
                    + taskIds[Math.round(Math.random() * (taskIds.length - 1))].id + '), ' + '('
                    + res[1][Math.round(Math.random() * 7) + 3].id + ', '
                    + taskIds[Math.round(Math.random() * (taskIds.length - 1))].id + '), ' + '('
                    + res[1][Math.round(Math.random() * 7) + 3].id + ', '
                    + taskIds[Math.round(Math.random() * (taskIds.length - 1))].id + '), ' + '('
                    + res[1][Math.round(Math.random() * 7) + 3].id + ', '
                    + taskIds[Math.round(Math.random() * (taskIds.length - 1))].id + ')';
                pool.query(task2helperQuery, cb);
              }
            });
          }
        });
      }
    });
}

function registerUser(userData, cb) {
  auth.createUser(userData.username, userData.password, userData.email, userData.role, userData.universityDepartmentId,
    userData.subdepartmentId, cb);
}