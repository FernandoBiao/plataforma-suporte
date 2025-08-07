const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'seu-email@dominio.com', // seu e-mail
    pass: 'sua-senha-ou-senha-de-app', // senha app ou normal (se permitido)
  },
});

function sendMail(mailOptions) {
  return transporter.sendMail(mailOptions);
}

module.exports = { sendMail };
