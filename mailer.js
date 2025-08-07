const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fernando.sbiao@gmail.com', // seu e-mail
    pass: 'zpfqalmwadbpihuh', // senha app ou normal (se permitido)
  },
});

function sendMail(mailOptions) {
  return transporter.sendMail(mailOptions);
}

module.exports = { sendMail };
