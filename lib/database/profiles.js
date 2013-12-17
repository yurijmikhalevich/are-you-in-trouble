/**
 * @license GPLv3
 * @author 0@39.yt (Yurij Mikhalevich)
 */

var settings = require('cat-settings'),
    pool = require('./pool'),
    routines = require('./routines'),
    prefix = settings.database.prefix,
    defaultOrder = [
      {column: 'display_name', direction: 'ASC'}
    ], defaultFilters = {};


/**
 * @param {number} offset
 * @param {number} limit
 * @param {{column: string, direction: string}[]} order
 * @param {Object} filters
 * @param {Function} cb
 */
exports.retrieve = function(offset, limit, order, filters, cb) {
  var query = 'SELECT u.*, u.created_at::TEXT, u.updated_at::TEXT FROM "' +
      prefix + 'user" AS u';
  routines.execSelectQuery(query, [], 'u', offset, limit,
      order || defaultOrder, filters || defaultFilters, cb);
};


/**
 * @param {Object} profile
 * @param {Function} cb
 */
exports.save = function(profile, cb) {
  if (profile.id) {
    pool.query('UPDATE "' + prefix + 'user" SET updated_at = $1,' +
        ' display_name = $2, phone = $3 WHERE id = $4 RETURNING *,' +
        ' created_at::TEXT, updated_at::TEXT', [new Date(), profile.displayName,
          profile.phone, profile.id],
        routines.returnOneEntity(cb, 'There is no user with id ' + profile.id));
  } else {
    pool.query('INSERT INTO "' + prefix + 'user" (created_at, updated_at,' +
        ' display_name, email, phone, role, university_department_id,' +
        ' subdepartment_id) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)' +
        ' RETURNING *, created_at::TEXT, updated_at::TEXT', [new Date(),
          new Date(), profile.displayName, profile.email, profile.phone,
          profile.role, profile.universityDepartmentId,
          profile.subdepartmentId], routines.returnOneEntity(cb));
  }
};


/**
 * @param {number} profileId
 * @param {Function} cb
 */
exports.remove = function(profileId, cb) {
  pool.query('DELETE FROM "' + prefix + 'user" WHERE id = $1', [profileId], cb);
};


/**
 * @param {number} userId
 * @param {number} universityDepartmentId
 * @param {Function} cb
 */
exports.makeClient = function(userId, universityDepartmentId, cb) {
  pool.query('UPDATE "' + prefix + 'user" SET role = \'client\',' +
      ' university_department_id = $1, subdepartment_id = NULL,' +
      ' updated_at = $2 WHERE id = $3 RETURNING *, created_at::TEXT,' +
      ' updated_at::TEXT', [universityDepartmentId, new Date(), userId],
      routines.returnOneEntity(cb));
};


/**
 * @param {number} userId
 * @param {boolean} chief Indicates, whether user should be a subdepartment
 * chief
 * @param {number} subdepartmentId
 * @param {Function} cb
 */
exports.makeHelper = function(userId, chief, subdepartmentId, cb) {
  pool.query('UPDATE "' + prefix + 'user" SET role = $1,' +
      ' subdepartment_id = $2, university_department_id = NULL,' +
      ' updated_at = $3 WHERE id = $4 RETURNING *, created_at::TEXT,' +
      ' updated_at::TEXT', [(chief ? 'subdepartment chief' : 'helper'),
        subdepartmentId, new Date(), userId], routines.returnOneEntity(cb));
};


/**
 * @param {number} userId
 * @param {Function} cb
 */
exports.makeDepartmentChief = function(userId, cb) {
  pool.query('UPDATE "' + prefix + 'user" SET role = \'department chief\',' +
      ' university_department_id = NULL, subdepartment_id = NULL,' +
      ' updated_at = $1 WHERE id = $2 RETURNING *, created_at::TEXT,' +
      ' updated_at::TEXT', [new Date(), userId], routines.returnOneEntity(cb));
};
