/**
 * @license GPLv3
 * @author 0@39.yt (Yurij Mikhalevich)
 */

var logger = require('winston');


/**
 * @param {Object} req Express.io request object
 * @param {Object} response
 * @return {Function}
 */
exports.respond = function(req, response) {
  return function(err, res) {
    if (err) {
      req.io.emit('err', err.toString());
      logger.error(err.toString(), err);
    } else {
      req.io.respond(response || res);
    }
  };
};


/**
 * @param {Object} req
 * @param {Function} cb
 * @return {Function}
 */
exports.doNext = function(req, cb) {
  return function(err, res) {
    if (err) {
      req.io.emit('err', err.toString());
      logger.error(err.toString(), err);
    } else {
      cb(res);
    }
  };
};
