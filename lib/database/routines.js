/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var logger = require('winston')
  , pool = require('./pool')
  , errors = require('./../errors');

/**
 * Compiles order object into 'ORDER BY ' string
 * @param {Object[]} order Array of objects with fields column and direction
 * @param {string} tableName Name of table, which we ordering
 * @returns {string} 'ORDER BY ' string
 */
exports.compileOrder = function (order, tableName) {
  var compiled = '';
  order.forEach(function (element) {
    if (!compiled) {
      compiled = 'ORDER BY ';
    } else {
      compiled += ', ';
    }
    compiled += tableName + '.' + element.column + ' ' + element.direction;
  });
  return compiled;
};

exports.compileFilters = function (filters, tableName, counter) {
  filters = snakeize(filters);
  var compiled = ''
    , placeholdersData = [];
  var columns = Object.keys(filters);
  if (!columns.length) {
    return {
      compiled: compiled,
      placeholdersData: placeholdersData,
      counter: counter
    };
  }
  columns.forEach(function (column) {
    if (!compiled) {
      compiled = tableName + '.' + column;
    } else {
      compiled += ' AND ' + tableName + '.' + column;
    }
    if (filters[column] instanceof Array) {
      // if array filter with IN
      var compiledInFilter = compileInFilter(filters[column], counter);
      counter = compiledInFilter.counter;
      Array.prototype.push.apply(placeholdersData, compiledInFilter.placeholdersData);
      compiled += ' IN (' + compiledInFilter.compiled + ')';
    } else if (column !== 'role' && column !== 'email' && typeof filters[column] === 'string') {
      // if string filter with LIKE
      compiled += ' LIKE \'%$' + (++counter) + '%\'';
      placeholdersData.push(filters[column]);
    } else if (filters[column] === null) {
      // if null filter with IS NULL
      compiled += ' IS NULL';
    } else {
      // if not array, not null and not string filter by equality
      compiled += ' = $' + (++counter);
      placeholdersData.push(filters[column]);
    }
  });
  return {
    compiled: compiled,
    placeholdersData: placeholdersData,
    counter: counter
  };
};

function compileInFilter(filter, counter) {
  var compiled = ''
    , placeholdersData = [];
  filter.forEach(function (value) {
    if (compiled) {
      compiled += ', ';
    }
    // NOTICE: we can't use NULL with IN filter
    compiled += '$' + (++counter);
    placeholdersData.push(value);
  });
  return {
    compiled: compiled,
    placeholdersData: placeholdersData,
    counter: counter
  };
}

/**
 * Prepares and executes query, returning array for result rows
 * @param {string} query Base query
 * @param {Array} placeholdersData Array with base query data
 * @param {string} tableName
 * @param {number} offset
 * @param {number} limit
 * @param {Object[]} order
 * @param {Object} filters
 * @param {Function} cb
 */
exports.execSelectQuery = function (query, placeholdersData, tableName, offset, limit, order, filters, cb) {
  var counter = placeholdersData.length;
  if (Object.keys(filters).length) {
    var compiledFilters = this.compileFilters(filters, tableName, counter);
    counter = compiledFilters.counter;
    query += ' WHERE ' + compiledFilters.compiled;
    Array.prototype.push.apply(placeholdersData, compiledFilters.placeholdersData);
  }
  query += ' GROUP BY ' + tableName + '.id';
  query += ' ' + this.compileOrder(order, tableName);
  query += ' OFFSET $' + (++counter) + ' LIMIT $' + (++counter);
  Array.prototype.push.apply(placeholdersData, [ offset, limit ]);
  logger.debug('Executing query %s, with placeholders %s', query, placeholdersData.join(', '));
  pool.query(query, placeholdersData, this.returnAllEntities(cb));
};

/**
 * @param {Function} cb
 * @param {string} [altErrorMessage]
 * @returns {Function}
 */
exports.returnOneEntity = function (cb, altErrorMessage) {
  return function (err, res) {
    if (err || !res.rowCount) {
      cb(err || new errors.Internal(altErrorMessage), null);
    } else {
      cb(null, camelize(res.rows[0]));
    }
  };
};

/**
 * @param {Function} cb
 * @returns {Function}
 */
exports.returnAllEntities = function (cb) {
  return function (err, res) {
    cb(err, res ? camelize(res.rows) : null);
  };
};

/**
 * Snakeize function from npm module snakeize, patched to morph string values too.
 * @param {Object|Array} obj
 * @returns {Object|Array}
 */
function snakeize(obj) {
  if (typeof obj === 'string') return snakeCase(obj);
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(snakeize);
  return Object.keys(obj).reduce(function (acc, key) {
    var snake = snakeCase(key);
    acc[snake] = snakeize(obj[key]);
    return acc;
  }, {});
}

function snakeCase(str) {
  return str[0].toLowerCase() + str.slice(1).replace(/([A-Z]+)/g, function (m, x) {
    return '_' + x.toLowerCase();
  });
}

/**
 * Camelize function from npm module camelize, patched not to morph string values too.
 * @param {Object|Array} obj
 * @returns {Object|Array}
 */
function camelize(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) return obj.map(camelize);
  return Object.keys(obj).reduce(function (acc, key) {
    var camel = camelCase(key);
    acc[camel] = camelize(obj[key]);
    return acc;
  }, {});
}

function camelCase(str) {
  return str.replace(/[_.-](\w|$)/g, function (_,x) {
    return x.toUpperCase()
  });
}