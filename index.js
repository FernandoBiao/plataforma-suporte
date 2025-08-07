// index.js
const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const nodemailer = require('./mailer');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));

const chamadosFile = path.join(__dirname, 'chamados.json');
let chamados = [];
if (fs.existsSync(chamadosFile)) {
  chamados = JSON.parse(fs.readFileSync(chamadosFile));
}

app.get('/', (req, res) => {
  res.render('form', { mensagem: null });
});

app.get('/admin', (req, res) => {
  res.render('admin', { chamados });
});

app.post('/criar-chamado', (req, res) => {
  const { nome, email, assunto, subAssunto, descricao } = req.body;
  const prioridade = definirPrioridade(assunto, subAssunto);

  const novoChamado = {
    id: chamados.length + 1,
    nome,
    email,
    assunto,
    subAssunto,
    descricao,
    prioridade,
    status: 'Aberto',
    dataCriacao: new Date().toLocaleString()
  };

  chamados.push(novoChamado);
  fs.writeFileSync(chamadosFile, JSON.stringify(chamados, null, 2));

  const mailOptions = {
    from: 'fernando.sbiao@gmail.com',
    to: email,
    subject: `Confirmação de Abertura de Chamado #${novoChamado.id}`,
    text: `Olá ${nome},\n\nSeu chamado foi criado com sucesso.\n\nNúmero do Chamado: #${novoChamado.id}\nAssunto: ${assunto}\nSub-Assunto: ${subAssunto}\nPrioridade: ${prioridade}\n\nEm breve entraremos em contato.\n\nObrigado!`
  };

  nodemailer.sendStatusUpdateEmail(email, novoChamado.id, 'Aberto');

  res.render('form', { mensagem: `Chamado #${novoChamado.id} criado com sucesso!` });
});

app.post('/atualizar-status', (req, res) => {
  const { id, status } = req.body;
  const chamado = chamados.find(c => c.id === parseInt(id));
  if (chamado) {
    chamado.status = status;
    fs.writeFileSync(chamadosFile, JSON.stringify(chamados, null, 2));
    nodemailer.sendStatusUpdateEmail(chamado.email, chamado.id, status);
  }
  res.redirect('/admin');
});

function definirPrioridade(assunto, subAssunto) {
  const regras = {
    'Pedidos': {
      'Integração de Pedidos': 'Alta',
      'Dúvidas/Auxilio': 'Baixa'
    },
    'Produto/Anúncio': {
      'Vinculo de produto/anúncio com erro': 'Média',
      'Dúvidas/Auxilio': 'Baixa'
    }
  };
  return (regras[assunto] && regras[assunto][subAssunto]) || 'Média';
}

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
