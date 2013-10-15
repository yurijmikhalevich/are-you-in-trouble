/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var express = require('express.io')
  , path = require('path')
  , settings = require('cat-settings').loadSync(path.join(__dirname, 'settings.json'))
  , logger = require('winston')
  , passport = require('passport')
  , passportIo = require('passport.socketio')
  , LocalAuthStrategy = require('passport-local').Strategy
  , LdapAuthStrategy = require('passport-ldapauth').Strategy
  , models = require('./lib/models')
  , auth = require('./lib/auth')
  , app = express()
  , sessionConfiguration = {
    cookieParser: express.cookieParser,
    secret: settings.secret,
    key: 'session',
    cookie: { maxAge: 604800000 }
  }
  , routes = {
    tasks: require('./routes/tasks')
  };


logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug', colorize: true, timestamp: true });


models.init(function () {
  app.http().io();

  app.use('/static/', express.static(path.join(__dirname, 'public')));
  app.use(express.favicon());
  if (process.env.NODE_ENV !== 'production') {
    app.use(express.logger('dev'));
  }
  app.use(express.bodyParser());
  app.use(express.cookieParser());
  app.use(express.session(sessionConfiguration));
  app.use(passport.initialize());
  app.use(passport.session());
  app.use(express.methodOverride());
  app.use(app.router);

  passport.serializeUser(auth.serializeUser);
  passport.deserializeUser(auth.deserializeUser);

  passport.use(new LocalAuthStrategy({
    usernameField: 'username',
    passwordField: 'password'
  }, auth.localStrategy));

  passport.use(new LdapAuthStrategy({
    server: settings.ldap,
    usernameField: 'username',
    passwordField: 'password'
  }, auth.ldapStrategy));

  app.io.set('authorization', passportIo.authorize(sessionConfiguration));
  // all socket signals are handled only for authorized users

  app.get('/', function (req, res) {
    res.redirect('/static/');
  });

  app.post('/login-internal/', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/' }));

  app.post('/login/', passport.authenticate('ldapauth', { session: true, successRedirect: '/', failureRedirect: '/' }));

  app.get('/logout/', function (req, res) { console.log(req.user); req.logout(); res.redirect('/'); });
  app.get('/register/', require('./routes/register').register);

  app.io.route('tasks', routes.tasks);

  app.listen(settings.port);
});