const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'fernando.sbiao@gmail.com',
    pass: 'zpfqalmwadbpihuh', // senha de app, sem espaços
  },
});

// Função genérica para enviar e-mails, recebe as opções do mail
function sendMail(mailOptions) {
  return transporter.sendMail(mailOptions);
}

// Função específica para enviar e-mail de atualização de status (opcional)
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

module.exports = { sendMail, sendStatusUpdateEmail };
