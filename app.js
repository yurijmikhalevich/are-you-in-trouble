/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var express = require('express.io')
  , path = require('path')
  , settings = require('cat-settings').loadSync(path.join(__dirname, 'settings.json'))
  , models = require('./lib/models')
  , tasks = require('./routes/tasks')
  , app = express();

app.http().io();

app.use('/static/', express.static(path.join(__dirname, 'public')));
app.use(models);

app.io.route('tasks', tasks);

app.listen(settings.port);