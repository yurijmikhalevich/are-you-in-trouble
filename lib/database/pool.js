/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var anyDB = require('any-db')
  , settings = require('cat-settings');

module.exports = anyDB.createPool('postgres://' + settings.database.username + ':' + settings.database.password + '@'
  + settings.database.host + ':' + settings.database.port + '/' + settings.database.basename,
  { min: 2, max: 20 });