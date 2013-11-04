/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var settings = require('cat-settings')
  , pool = require('./pool')
  , errors = require('../errors')
  , prefix = settings.database.prefix;


exports.retrieve = function (taskId, cb) {
  pool.query('SELECT c.* FROM "' + prefix + 'task_comment" AS c WHERE c.task_id = $1', [ taskId ], function (err, res) {
    cb(err, res ? res.rows : null);
  });
};

exports.save = function (comment, cb) {
  if (comment.id) {
    pool.query('UPDATE "' + prefix + 'task_comment" SET updated_at = $1, content = $2, task_id = $3, user_id = $4 ' +
      'WHERE id = $5 RETURNING *', [ new Date(), comment.content, comment.task_id, comment.user_id, comment.id ],
      function (err, res) {
        if (err || !res.rowCount) {
          cb(err || new errors.Internal('There is no task comment with id ' + task.id), null);
        } else {
          cb(null, res.rows[0]);
        }
      });
  } else {
    pool.query('INSERT INTO "' + prefix + 'task_comment" (created_at, updated_at, content, task_id, user_id) VALUES ' +
      '($1, $2, $3, $4, $5) RETURNING *', [ new Date(), new Date(), comment.content, comment.task_id,
      comment.user_id ], function (err, res) {
        if (err || !res.rowCount) {
          cb(err || new errors.Internal(), null);
        } else {
          cb(null, res.rows[0]);
        }
      });
  }
};

exports.remove = function (commentId, cb) {
  pool.query('DELETE FROM "' + prefix + 'task_comment" WHERE id = $1', [ commentId ], cb);
};