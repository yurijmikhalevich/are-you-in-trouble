/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var nodemailer = require('nodemailer')
  , logger = require('winston')
  , settings = require('cat-settings')
  , async = require('async')
  , db = require('./database')
  , errors = require('./errors')
  , transport = nodemailer.createTransport('SMTP', settings.mailer);

/**
 * @param {string|Array} to
 * @param {string} subject
 * @param {string} text
 */
exports.sendMail = function (to, subject, text) {
  if (to instanceof Array) {
    to = to.join(', ');
  }
  transport.sendMail({
    from: settings.mailer.from,
    bcc: to,
    subject: subject,
    text: text
  }, function (err) {
    if (err) {
      logger.error(err.toString(), err);
    }
  })
};

// FIXME: optimize next code :3

/**
 * @param {string} event
 * @param {Object} task
 */
exports.mailUsersAboutTaskUpdate = function (event, task) {
  var subject
    , text;
  if (event === 'tasks:insert') {
    subject = settings.mailer.blanks.taskCreated.subject;
    text = settings.mailer.blanks.taskCreated.text;
  } else if (event === 'tasks:update') {
    subject = settings.mailer.blanks.taskUpdated.subject;
    text = settings.mailer.blanks.taskUpdated.text;
  } else if ([ 'tasks:add helper', 'tasks:remove helper' ].indexOf(event) !== -1) {
    subject = settings.mailer.blanks.helpersChanged.subject;
    text = settings.mailer.blanks.helpersChanged.text;
  }
  if (subject) { // && text=
    db.tasks.retrieve.forDepartmentChief(0, 1, [ { column: 'id', direction: 'ASC' } ], { id: comment.taskId },
      function (err, tasks) {
        if (err || !tasks.length) {
          logger.error(err.toString(), err);
        } else {
          task = tasks[0];
          async.parallel([
            function (cb) {
              prepareTaskForMailing(task, cb);
            },
            function (cb) {
              retrieveMailList(task, cb);
            }
          ], function (err, res) {
            if (err) {
              logger.error(err.toString(), err);
            } else {
              subject = compileString(subject, res[0]);
              text = compileString(text, res[0]);
              exports.sendMail(res[1], subject, text);
            }
          });
        }
      });
  }
};

/**
 * @param {string} event
 * @param {Object} comment
 */
exports.mailUsersAboutTaskCommentUpdate = function (event, comment) {
  if (event === 'task comments:insert') {
    async.waterfall([
      function (cb) {
        db.tasks.retrieve.forDepartmentChief(0, 1, [ { column: 'id', direction: 'ASC' } ], { id: comment.taskId },
          function (err, tasks) {
            if (err || !tasks.length) {
              cb(err || new errors.Internal(), null);
            } else {
              cb(null, tasks[0]);
            }
          });
      }, function (task, cb) {
        async.parallel([
          function (cb) { // preparing task object
            prepareTaskForMailing(task, cb);
          },
          function (cb) { // preparing comment object
            prepareCommentForMailing(comment, cb);
          },
          function (cb) {
            retrieveMailList(task, cb);
          }
        ], cb);
      }
    ], function (err, res) {
      if (err) {
        logger.error(err.toString(), err);
      } else {
        var subject = settings.mailer.blanks.taskCommentAdded.subject
          , text = settings.mailer.blanks.taskCommentAdded.text;
        subject = compileString(subject, res[0], res[1]);
        text = compileString(text, res[0], res[1]);
        exports.sendMail(res[2], subject, text);
      }
    });
  }
};

/**
 * @param {string} string
 * @param {Object} task
 * @param {Object} [comment]
 * @returns {string}
 */
function compileString(string, task, comment) {
  return string.replace(/{{id}}/g, task.id)
    .replace(/{{content}}/g, task.content)
    .replace(/{{universityDepartment}}/g, task.universityDepartment)
    .replace(/{{client}}/g, task.client || 'Unknown')
    .replace(/{{type}}/g, task.type)
    .replace(/{{state}}/g, task.state)
    .replace(/{{createdAt/g, task.createdAt)
    .replace(/{{subdepartment}}/g, task.subdepartment)
    .replace(/{{helpers}}/g, task.helpers.length ? task.helpers.join(', ') : 'Unassigned')
    .replace(/{{comment}}/g, comment ? comment.content : undefined)
    .replace(/{{author}}/g, comment ? comment.user : undefined);
}

/**
 * @param {Object} task
 * @param {Function} cb
 */
function prepareTaskForMailing(task, cb) {
  async.parallel([
    function (cb) {
      db.registries.retrieve('university department', task.universityDepartmentId, cb);
    },
    function (cb) {
      db.registries.retrieve('task type', task.typeId, cb);
    },
    function (cb) {
      if (task.subdepartmentId) {
        db.registries.retrieve('subdepartment', task.subdepartmentId, cb);
      } else {
        cb(null, [ { name: 'Not assigned' } ]);
      }
    },
    function (cb) {
      var profileIds = [];
      if (task.clientId) {
        profileIds.push(task.clientId);
      }
      if (task.helperIds) {
        Array.prototype.push(profileIds, task.helperIds);
      }
      if (profileIds.length) {
        db.profiles.retrieve(0, 100, [ { column: 'id', direction: 'ASC' } ], { id: profileIds }, cb);
      } else {
        cb(null, []);
      }
    }
  ], function (err, res) {
    if (err) {
      cb(err, null);
    } else {
      task.universityDepartment = res[0][0].name;
      task.type = res[1][0].name;
      task.state = (task.closedById ? 'Closed' : 'Open');
      task.subdepartment = res[2][0].name;
      task.helpers = [];
      res[3].forEach(function (profile) {
        if (profile.id === task.clientId) {
          task.client = profile.name;
        } else {
          task.helpers.push(profile.name);
        }
      });
      cb(null, task);
    }
  });
}

/**
 * @param {Object} comment
 * @param {Function} cb
 */
function prepareCommentForMailing(comment, cb) {
  db.profiles.retrieve(0, 1, [ { column: 'id', direction: 'ASC' } ], { id: comment.userId }, function (err, res) {
    if (err || !res.length) {
      cb(err || new errors.Internal(), null);
    } else {
      comment.user = res[0].name;
    }
  });
}

/**
 * @param {Object} task
 * @param {Function} cb
 */
function retrieveMailList(task, cb) {
  async.parallel([
    function (cb) { // retrieving clients, who should be mailed
      db.profiles.retrieve(0, 100, undefined, { universityDepartmentId: task.universityDepartmentId }, cb);
    },
    function (cb) { // retrieving subdepartment chiefs, who should be mailed
      if (task.subdepartmentId) {
        db.profiles.retrieve(0, 100, undefined,
          { subdepartmentId: task.subdepartmentId, role: 'subdepartment chief' }, cb);
      } else {
        cb(null, []);
      }
    },
    function (cb) { // retrieving helpers, who should be mailed
      if (task.helperIds && task.helperIds.length) {
        db.profiles.retrieve(0, 100, [ { column: 'id', direction: 'ASC' } ], { id: task.helperIds }, cb);
      } else {
        cb(null, []);
      }
    },
    function (cb) { // retrieving all department chiefs
      db.profiles.retrieve(0, 100, undefined, { role: 'department chief' }, cb);
    }
  ], function (err, res) {
    if (err) {
      cb(err, null);
    } else {
      var profileList = []
        , mailList = [];
      res.forEach(function (profiles) {
        Array.prototype.push(profileList, profiles);
      });
      profileList.forEach(function (profile) {
        if (mailList.indexOf(profile.email) === -1) {
          mailList.push(profile.email);
        }
      });
      cb(null, mailList);
    }
  });
}