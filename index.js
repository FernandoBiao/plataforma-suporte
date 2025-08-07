const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const session = require('express-session');
const nodemailer = require('./mailer');

const app = express();
const PORT = process.env.PORT || 10000;

app.use(bodyParser.urlencoded({ extended: true }));
app.set('view engine', 'ejs');
app.use(express.static('public'));
app.use(session({
  secret: 'umaChaveSecretaMuitoSegura',
  resave: false,
  saveUninitialized: false
}));

const chamadosFile = path.join(__dirname, 'chamados.json');
const usuariosFile = path.join(__dirname, 'usuarios.json');

function formatarDataBR(data) {
  return data.toLocaleString('pt-BR', {
    timeZone: 'America/Sao_Paulo',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

let chamados = [];
if (fs.existsSync(chamadosFile)) {
  try {
    chamados = JSON.parse(fs.readFileSync(chamadosFile, 'utf8') || '[]');
  } catch { chamados = []; }
}

let usuarios = [];
if (fs.existsSync(usuariosFile)) {
  try {
    usuarios = JSON.parse(fs.readFileSync(usuariosFile, 'utf8') || '[]');
  } catch { usuarios = []; }
}

function requireAuth(req, res, next) {
  if (req.session.usuario) next();
  else res.redirect('/login');
}

// Login
app.get('/login', (req, res) => res.render('login', { error: null }));
app.post('/login', (req, res) => {
  const { email, senha } = req.body;
  const user = usuarios.find(u => u.email === email);
  if (user && bcrypt.compareSync(senha, user.senha)) {
    req.session.usuario = { email: user.email, nome: user.nome };
    return res.redirect('/admin');
  }
  res.render('login', { error: 'Email ou senha inválidos.' });
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => res.redirect('/login'));
});

// Cadastro (somente se já estiver logado como administrador)
app.get('/cadastro-usuario', requireAuth, (req, res) => res.render('cadastro', { error: null }));
app.post('/cadastro-usuario', requireAuth, (req, res) => {
  const { nome, email, senha } = req.body;
  if (usuarios.some(u => u.email === email)) return res.render('cadastro', { error: 'Email já cadastrado.' });
  const senhaHash = bcrypt.hashSync(senha, 10);
  usuarios.push({ nome, email, senha: senhaHash });
  fs.writeFileSync(usuariosFile, JSON.stringify(usuarios, null, 2));
  res.redirect('/admin');
});

// Formulário de Chamado
app.get('/', (req, res) => res.render('form', { success: false }));
app.post('/criar-chamado', requireAuth, (req, res) => {
  const { nome, email, assunto, subAssunto, descricao } = req.body;
  if (!nome || !email || !assunto || !subAssunto || !descricao) {
    return res.render('form', { success: false, erro: 'Todos os campos são obrigatórios.' });
  }
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
    usuario: req.session.usuario.email,
    dataCriacao: formatarDataBR(new Date()),
    historico: []
  };
  chamados.push(novoChamado);
  fs.writeFileSync(chamadosFile, JSON.stringify(chamados, null, 2));

  nodemailer.sendMail({
    from: 'fernando.sbiao@gmail.com',
    to: email,
    subject: `Confirmação de Abertura de Chamado #${novoChamado.id}`,
    text: `Olá ${nome}, seu chamado foi criado com sucesso. Nº #${novoChamado.id}`
  }, (err, info) => err ? console.error(err) : console.log('E-mail enviado:', info.response));

  res.redirect('/sucesso');
});

// Admin e chamados do próprio usuário
app.get('/admin', requireAuth, (req, res) => {
  const meus = chamados.filter(c => c.usuario === req.session.usuario.email);
  res.render('admin', { chamados: meus, usuario: req.session.usuario });
});

app.post('/atualizar-status', requireAuth, (req, res) => {
  const { id, status, descricaoAtualizacao } = req.body;
  const chamado = chamados.find(c => c.id === parseInt(id));
  if (chamado && chamado.usuario === req.session.usuario.email) {
    chamado.status = status;
    chamado.historico.push({ data: formatarDataBR(new Date()), status, descricao: descricaoAtualizacao?.trim() || '' });
    fs.writeFileSync(chamadosFile, JSON.stringify(chamados, null, 2));
    nodemailer.sendStatusUpdateEmail(chamado.email, chamado.id, status, descricaoAtualizacao)
      .then(info => console.log('E-mail atualizado enviado:', info.response))
      .catch(err => console.log(err));
  }
  res.redirect('/admin');
});

function definirPrioridade(assunto, subAssunto) {
  const regras = { 'Pedidos': { 'Integração de Pedidos': 'Alta', 'Dúvidas / Auxílio': 'Baixa' }, 'Produto/Anúncio': { 'Vínculo de produto/anúncio com erro': 'Média', 'Dúvidas / Auxílio': 'Baixa' } };
  return (regras[assunto] && regras[assunto][subAssunto]) || 'Média';
}

app.listen(PORT, () => console.log(`Servidor rodando em http://localhost:${PORT}`));
