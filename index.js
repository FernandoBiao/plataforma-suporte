const express = require('express');
const bodyParser = require('body-parser');
const basicAuth = require('express-basic-auth');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const app = express();
const PORT = process.env.PORT || 3000;

// Configurações
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');

// Banco de dados
const db = new sqlite3.Database('./tickets.db');
db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT,
    email TEXT,
    assunto TEXT,
    descricao TEXT,
    prioridade TEXT,
    status TEXT DEFAULT 'Novo',
    criado_em DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);
});

// Página inicial - Formulário
app.get('/', (req, res) => {
  res.render('form');
});

// Enviar formulário
app.post('/submit', (req, res) => {
  const { nome, email, assunto, descricao, prioridade } = req.body;
  db.run(`INSERT INTO tickets (nome, email, assunto, descricao, prioridade) VALUES (?, ?, ?, ?, ?)`,
    [nome, email, assunto, descricao, prioridade],
    err => {
      if (err) return res.send('Erro ao enviar chamado');
      res.send('<h2>Chamado enviado com sucesso!<br><a href="/">Voltar</a></h2>');
    });
});

// Autenticação admin
app.use('/admin', basicAuth({
  users: { 'admin': 'senha123' },
  challenge: true
}));

// Painel de chamados
app.get('/admin', (req, res) => {
  db.all(`SELECT * FROM tickets ORDER BY criado_em DESC`, (err, rows) => {
    if (err) return res.send('Erro ao carregar chamados');
    res.render('admin', { tickets: rows });
  });
});

// Atualizar status
app.post('/admin/update/:id', (req, res) => {
  const { status } = req.body;
  const { id } = req.params;
  db.run(`UPDATE tickets SET status = ? WHERE id = ?`, [status, id], err => {
    res.redirect('/admin');
  });
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});