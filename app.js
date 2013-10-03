/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var express = require('express.io')
  , path = require('path')
  , settings = require('cat-settings').loadSync(path.join(__dirname, 'settings.json'))
  , passport = require('passport')
  , models = require('./lib/models')
  , app = express()
  , sessionConfiguration = {
    cookieParser: express.cookieParser,
    secret: settings.secret,
    key: 'session',
    cookie: { maxAge: 604800000 }
  };

app.http().io();

app.use('/static/', express.static(path.join(__dirname, 'public')));
app.use(models);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.cookieParser());
app.use(express.session(sessionConfiguration));
app.use(passport.initialize());
app.use(passport.session());
app.use(express.methodOverride());
app.use(app.router);

var LocalAuthStrategy = require('passport-local').Strategy
  , auth = require('./lib/auth');

passport.serializeUser(auth.serializeUser);
passport.deserializeUser(auth.deserializeUser);

passport.use(new LocalAuthStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, auth.localStrategy));

var passportIo = require('passport.socketio');
app.io.set('authorization', passportIo.authorize(sessionConfiguration));

var LdapAuthStrategy = require('passport-ldapauth').Strategy;

passport.use(new LdapAuthStrategy({
  server: {
    url: 'ldap://dc0.kubsau.local'
  },
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}));

var routes = {
  tasks: require('./routes/tasks')
};

app.get('/', function (req, res) {
  res.redirect('/static/');
});

app.post('/login/', passport.authenticate('local',
  { successRedirect: '/ssss/', failureRedirect: '/' }));

app.post('/login-ldap/', passport.authenticate('ldapauth', { session: true }), function (req, res) {
  res.send({ status: 'ok' });
});

app.get('/logout/', function (req, res) { console.log(req.user); req.logout(); res.redirect('/'); });
app.get('/register/', require('./routes/register').register);

app.io.route('tasks', routes.tasks);

app.listen(settings.port);