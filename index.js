const express = require('express');
const bodyParser = require('body-parser');
const nodemailer = require('nodemailer');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Página inicial (formulário)
app.get('/', (req, res) => {
  res.render('form', { success: false });
});

// Página do admin para visualizar os chamados
app.get('/admin', (req, res) => {
  const chamadosPath = path.join(__dirname, 'chamados.json');
  const chamados = fs.existsSync(chamadosPath)
    ? JSON.parse(fs.readFileSync(chamadosPath))
    : [];
  res.render('admin', { chamados });
});

// Rota para criar chamado
app.post('/criar-chamado', (req, res) => {
  const { nome, email, assunto, mensagem } = req.body;
  const chamado = { nome, email, assunto, mensagem, data: new Date().toLocaleString() };

  const chamadosPath = path.join(__dirname, 'chamados.json');
  const chamados = fs.existsSync(chamadosPath)
    ? JSON.parse(fs.readFileSync(chamadosPath))
    : [];

  chamados.push(chamado);
  fs.writeFileSync(chamadosPath, JSON.stringify(chamados, null, 2));

  // (Opcional) Enviar e-mail - configurar depois se quiser

  res.render('form', { success: true });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
