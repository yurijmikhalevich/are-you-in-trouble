/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var settings = require('cat-settings')
  , pool = require('./pool')
  , routines = require('./routines')
  , prefix = settings.database.prefix;


exports.retrieve = function (taskId, cb) {
  pool.query('SELECT c.*, c.created_at::TEXT, c.updated_at::TEXT FROM "' + prefix + 'task_comment" AS c ' +
    'WHERE c.task_id = $1', [ taskId ], routines.returnAllEntities(cb));
};

exports.save = function (comment, cb) {
  if (comment.id) {
    pool.query('UPDATE "' + prefix + 'task_comment" SET updated_at = $1, content = $2, task_id = $3 ' +
      'WHERE id = $4 RETURNING *, created_at::TEXT, updated_at::TEXT', [ new Date(), comment.content, comment.taskId,
      comment.id ], routines.returnOneEntity(cb, 'There is no task comment with id ' + task.id));
  } else {
    pool.query('INSERT INTO "' + prefix + 'task_comment" (created_at, updated_at, content, task_id, user_id) VALUES ' +
      '($1, $2, $3, $4, $5) RETURNING *, created_at::TEXT, updated_at::TEXT', [ new Date(), new Date(), comment.content,
      comment.taskId, comment.userId ], routines.returnOneEntity(cb));
  }
};

exports.remove = function (commentId, cb) {
  pool.query('DELETE FROM "' + prefix + 'task_comment" WHERE id = $1 RETURNING *', [ commentId ],
    routines.returnOneEntity(cb, 'There is no task comment with id ' + commentId));
};