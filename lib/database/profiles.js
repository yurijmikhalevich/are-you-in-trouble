/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var settings = require('cat-settings')
  , logger = require('winston')
  , pool = require('./pool')
  , routines = require('./routines')
  , errors = require('../errors')
  , prefix = settings.database.prefix
  , defaultOrder = [
    { column: 'displayname', direction: 'ASC' }
  ]
  , defaultFilters = {};

exports.retrieve = function (offset, limit, order, filters, cb) {
};

exports.save = function (profile, cb) {
};

exports.remove = function (profileId, cb) {
};