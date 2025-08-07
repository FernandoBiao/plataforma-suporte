const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fernando.sbiao@gmail.com',
    pass: 'zpfqalmwadbpihuh', // aqui vai a senha de app, sem espaços
  },
});

function sendStatusUpdateEmail(toEmail, ticketId, newStatus) {
  const mailOptions = {
    from: 'fernando.sbiao@gmail.com',
    to: toEmail,
    subject: `Atualização do seu chamado #${ticketId}`,
    text: `Olá,

O status do seu chamado #${ticketId} foi atualizado para: ${newStatus}.

Se precisar adicionar novas informações, responda este e-mail.

Obrigado!`,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendStatusUpdateEmail };
