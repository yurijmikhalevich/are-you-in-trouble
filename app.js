/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var express = require('express.io')
  , path = require('path')
  , settings = require('cat-settings').loadSync(path.join(__dirname, 'settings.json'))
  , passport = require('passport')
  , auth = require('./lib/auth')
  , models = require('./lib/models')
  , tasks = require('./routes/tasks')
  , app = express();

app.http().io();

app.use('/static/', express.static(path.join(__dirname, 'public')));
//app.use(models);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session({
  cookieParser: express.cookieParser,
  secret: settings.secret,
  key: 'session',
  cookie: { maxAge: 604800000 }
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.methodOverride());
app.use(app.router);

//models(function () {
//  auth.register('root', '12345', 'departmentChief', function (err, user) {
//    console.log(err, user);
//  });
//});

app.io.route('tasks', tasks);

app.listen(settings.port);