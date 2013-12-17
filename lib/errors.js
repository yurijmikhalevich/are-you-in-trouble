/**
 * @license GPLv3
 * @author 0@39.yt (Yurij Mikhalevich)
 */



/**
 * @param {string} message
 * @return {Error}
 * @constructor
 */
exports.Internal = function(message) {
  var error = new Error(message);
  error.name = 'InternalError';
  return error;
};
