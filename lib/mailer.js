/**
 * Copyright (C) 2013 Yurij Mikhalevich
 * @license GPLv3
 * @author Yurij Mikhalevich <0@39.yt>
 */

var nodemailer = require('nodemailer')
  , logger = require('winston')
  , settings = require('cat-settings')
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

/**
 * @param {string} event
 * @param {Object} task
 */
exports.mailUsersAboutTaskUpdate = function (event, task) {
  if (event === 'tasks:insert') {
    //
  } else if (event === 'tasks:update') {
    //
  } else if ([ 'tasks:add helper', 'tasks:remove helper' ].indexOf(event) !== -1) {
    //
  }
};

/**
 * @param {string} event
 * @param {Object} comment
 */
exports.mailUsersAboutTaskCommentUpdate = function (event, comment) {
};

function compileString(string, task, comment) {
  return string.replace('{{id}}', task.id)
    .replace('{{content}}', task.content)
    .replace('{{universityDepartment}}', task.universityDepartment)
    .replace('{{client}}', task.client || 'Unknown')
    .replace('{{type}}', task.type)
    .replace('{{state}}', task.state)
    .replace('{{createdAt}}', task.createdAt)
    .replace('{{subdepartment}}', task.subdepartment)
    .replace('{{helpers}}', task.helpers.join(', '))
    .replace('{{comment}}', comment.content)
    .replace('{{author}}', comment.user);
}