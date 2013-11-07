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
  , db = require('./lib/database')
  , auth = require('./lib/auth')
  , app = express()
  , sessionConfiguration = {
    cookieParser: express.cookieParser,
    secret: settings.secret,
    key: 'session',
    cookie: { maxAge: 604800000 }
  }
  , routes = {
    middlewares: require('./routes/middlewares'),
    tasks: require('./routes/tasks'),
    taskTypes: require('./routes/task_types'),
    subdepartments: require('./routes/subdepartments'),
    universityDepartments: require('./routes/university_departments'),
    taskComments: require('./routes/task_comments'),
    profiles: require('./routes/profiles')
  };

logger.remove(logger.transports.Console);
logger.add(logger.transports.Console, { level: process.env.NODE_ENV === 'production' ? 'info' : 'debug',
  colorize: true, timestamp: true });

logger.info('Initializing database');
db.init(function (err) {
  if (err) {
    logger.error(err.toString(), err);
    throw err;
  } else {
    logger.info('Database successfully initialized');
  }
});

app.http().io();

require('express.io-middleware')(app);

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

app.post('/login-internal/', passport.authenticate('local', { successRedirect: '/',
  failureRedirect: '/forbidden/' }));

app.post('/login/', passport.authenticate('ldapauth', { session: true, successRedirect: '/',
  failureRedirect: '/forbidden/' }));

app.get('/forbidden/', function (req, res) { res.send(403); });

app.get('/logout/', function (req, res) { console.log(req.user); req.logout(); res.redirect('/'); });

app.io.use(function (req, next) {
  logger.debug('Event "%s" registered.', req.io.event, { data: req.data, event: req.io.event });
  if (typeof req.data !== 'object') {
    logger.warn('"%s" signal data is not an object.', req.io.event, { data: req.data, event: req.io.event });
    var raw = req.data;
    req.data = {
      __raw: raw
    };
  }
  next();
});

app.io.use(routes.middlewares.checkPermissions);
app.io.use(routes.middlewares.validateRequestData);

app.io.route('tasks', routes.tasks);
app.io.route('task types', routes.taskTypes);
app.io.route('subdepartments', routes.subdepartments);
app.io.route('university departments', routes.universityDepartments);
app.io.route('task comments', routes.taskComments);
app.io.route('profiles', routes.profiles);

app.listen(settings.port);