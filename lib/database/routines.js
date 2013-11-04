/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

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
    } else if (column !== 'role' && typeof filters[column] === 'string') {
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