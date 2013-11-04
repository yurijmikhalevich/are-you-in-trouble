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
    to: to,
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
 * @param {Object} data
 */
exports.mailUsersAboutTaskUpdate = function (event, task, data) {
};

/**
 * @param {string} event
 * @param {Object} task
 * @param {number} helperId
 */
exports.mailUsersAboutHelpersChange = function (event, task, helperId) {
};

/**
 * @param {string} event
 * @param {Object} comment
 */
exports.mailUsersAboutTaskCommentUpdate = function (event, comment) {
};