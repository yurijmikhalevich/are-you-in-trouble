/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var express = require('express.io')
  , models = require('./lib/models')
  , tasks = require('./routes/tasks')
  , app = express();

app.http().io();

app.use(models);

app.io.route('tasks', tasks);

app.listen(8080);