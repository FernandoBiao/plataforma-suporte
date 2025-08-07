const express = require('express');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcrypt');
const session = require('express-session');
const bodyParser = require('body-parser');
const { sendStatusUpdateEmail } = require('./mailer');
const { autenticarUsuario } = require('./auth');

const app = express();
const PORT = process.env.PORT || 3000;
const dbPath = path.join(__dirname, 'db.json');

app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

app.use(session({
  secret: 'segredo',
  resave: false,
  saveUninitialized: false
}));

function lerDB() {
  const data = fs.readFileSync(dbPath);
  return JSON.parse(data);
}

function salvarDB(db) {
  fs.writeFileSync(dbPath, JSON.stringify(db, null, 2));
}

// ROTAS

app.get('/', (req, res) => res.redirect('/login'));

app.get('/login', (req, res) => res.render('login', { error: null }));

app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  autenticarUsuario(email, senha, (usuario) => {
    if (usuario) {
      req.session.usuario = usuario;
      res.redirect(usuario.admin ? '/admin' : '/meus-chamados');
    } else {
      res.render('login', { error: 'Credenciais inválidas.' });
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(() => res.redirect('/login'));
});

app.get('/cadastro', (req, res) => {
  if (!req.session.usuario?.admin) return res.redirect('/login');
  res.render('cadastro', { error: null });
});

app.post('/cadastro-usuario', async (req, res) => {
  const { nome, email, senha } = req.body;
  const db = lerDB();

  if (db.usuarios.find(u => u.email === email)) {
    return res.render('cadastro', { error: 'Email já cadastrado.' });
  }

  const senhaCriptografada = await bcrypt.hash(senha, 10);
  const novoUsuario = {
    id: db.usuarios.length + 1,
    nome,
    email,
    senha: senhaCriptografada,
    admin: false
  };

  db.usuarios.push(novoUsuario);
  salvarDB(db);
  res.redirect('/admin');
});

app.get('/admin', (req, res) => {
  if (!req.session.usuario?.admin) return res.redirect('/login');
  const db = lerDB();
  res.render('admin', { chamados: db.chamados });
});

app.get('/form', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  res.render('form');
});

app.post('/criar-chamado', (req, res) => {
  const { titulo, descricao } = req.body;
  const db = lerDB();
  const novoChamado = {
    id: db.chamados.length + 1,
    titulo,
    descricao,
    status: 'aberto',
    atualizacoes: [],
    criadoPor: req.session.usuario.email,
    criadoEm: new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })
  };

  db.chamados.push(novoChamado);
  salvarDB(db);
  res.render('sucesso', { chamado: novoChamado });
});

app.get('/meus-chamados', (req, res) => {
  if (!req.session.usuario) return res.redirect('/login');
  const db = lerDB();
  const chamadosUsuario = db.chamados.filter(c => c.criadoPor === req.session.usuario.email);
  res.render('meus-chamados', { chamados: chamadosUsuario });
});

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
