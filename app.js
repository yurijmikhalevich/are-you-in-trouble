/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var express = require('express.io')
  , path = require('path')
  , settings = require('cat-settings').loadSync(path.join(__dirname, 'settings.json'))
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

passport.serializeUser(auth.serializeUser);
passport.deserializeUser(auth.deserializeUser);

passport.use(new LocalAuthStrategy({
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}, auth.localStrategy));

passport.use(new LdapAuthStrategy({
  server: {
    url: 'ldap://dc0.kubsau.local'
  },
  usernameField: 'username',
  passwordField: 'password',
  passReqToCallback: true
}));

app.io.set('authorization', passportIo.authorize(sessionConfiguration));

app.get('/', function (req, res) {
  res.redirect('/static/');
});

app.post('/login-internal/', passport.authenticate('local', { successRedirect: '/', failureRedirect: '/' }));

app.post('/login/', passport.authenticate('ldapauth', { session: true }), function (req, res) {
  res.send({ status: 'ok' });
});

app.get('/logout/', function (req, res) { console.log(req.user); req.logout(); res.redirect('/'); });
app.get('/register/', require('./routes/register').register);

app.io.route('tasks', routes.tasks);

app.listen(settings.port);