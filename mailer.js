// mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fernando.sbiao@gmail.com',
    pass: 'zpfqalmwadbpihuh', // aqui vai a senha de app, sem espaços
  },
});

function sendMail(mailOptions, callback) {
  transporter.sendMail(mailOptions, callback);
}

function sendStatusUpdateEmail(toEmail, ticketId, newStatus, descricaoAtualizacao) {
  const mailOptions = {
    from: 'fernando.sbiao@gmail.com',
    to: toEmail,
    subject: `Atualização do seu chamado #${ticketId}`,
    text: `Olá,

O status do seu chamado #${ticketId} foi atualizado para: ${newStatus}.

Descrição da atualização:
${descricaoAtualizacao || 'Nenhuma descrição fornecida.'}

Se precisar adicionar novas informações, responda este e-mail.

Obrigado!`,
  };

  return transporter.sendMail(mailOptions);
}

module.exports = { sendMail, sendStatusUpdateEmail };
