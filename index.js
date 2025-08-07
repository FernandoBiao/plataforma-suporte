const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 10000;

// Configurar o SQLite
const db = new sqlite3.Database('./chamados.db', (err) => {
  if (err) {
    return console.error(err.message);
  }
  console.log('Conectado ao banco de dados SQLite.');
});

// Criar tabela de chamados, se não existir
db.run(`
  CREATE TABLE IF NOT EXISTS chamados (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    description TEXT NOT NULL,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Configurar EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Configurar arquivos estáticos e body-parser
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));

// Rota para o formulário
app.get('/', (req, res) => {
  res.render('form');
});

// Rota para processar formulário
app.post('/enviar', (req, res) => {
  const { name, email, description } = req.body;
  db.run(
    `INSERT INTO chamados (name, email, description) VALUES (?, ?, ?)`,
    [name, email, description],
    (err) => {
      if (err) {
        console.error(err.message);
        res.status(500).send('Erro ao salvar o chamado.');
      } else {
        res.redirect('/obrigado');
      }
    }
  );
});

// Página de agradecimento
app.get('/obrigado', (req, res) => {
  res.send('<h2>Chamado enviado com sucesso!</h2><a href="/">Voltar</a>');
});

// Rota da página de admin com correção do erro
app.get('/admin', (req, res) => {
  db.all('SELECT * FROM chamados ORDER BY createdAt DESC', (err, rows) => {
    if (err) {
      console.error(err);
      res.status(500).send("Erro ao buscar chamados.");
    } else {
      res.render('admin', { chamados: rows });
    }
  });
});

// Iniciar o servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
