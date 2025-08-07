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
  secret: 'segredo_supersecreto_123',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 3600000 } // 1 hora
}));

const dbFile = path.join(__dirname, 'db.json');

let db = { usuarios: [], chamados: [] };

// Função para carregar dados do db.json
function carregarDB() {
  if (fs.existsSync(dbFile)) {
    try {
      const data = fs.readFileSync(dbFile, 'utf8');
      db = data ? JSON.parse(data) : { usuarios: [], chamados: [] };
    } catch (err) {
      console.error('Erro ao ler arquivo db.json:', err);
      db = { usuarios: [], chamados: [] };
    }
  }
}

// Função para salvar dados no db.json
function salvarDB() {
  try {
    fs.writeFileSync(dbFile, JSON.stringify(db, null, 2));
  } catch (err) {
    console.error('Erro ao salvar arquivo db.json:', err);
  }
}

carregarDB();

// Middleware para verificar se está logado
function verificarLogin(req, res, next) {
  if (req.session.usuario) {
    return next();
  }
  res.redirect('/login');
}

// Middleware para verificar se é admin
function verificarAdmin(req, res, next) {
  if (req.session.usuario && req.session.usuario.admin) {
    return next();
  }
  res.status(403).send('Acesso negado');
}

// Função para formatar data no padrão brasileiro com hora de Brasília
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

// Página de login
app.get('/login', (req, res) => {
  res.render('login', { erro: null });
});

// Processar login
app.post('/login', (req, res) => {
  const { email, senha } = req.body;

  // Recarrega o DB a cada login para garantir atualização dos dados
  carregarDB();

  const usuario = db.usuarios.find(u => u.email === email);

  if (!usuario) {
    return res.render('login', { erro: 'Usuário não encontrado' });
  }

  if (!bcrypt.compareSync(senha, usuario.senha)) {
    return res.render('login', { erro: 'Senha incorreta' });
  }

  // Login bem sucedido
  req.session.usuario = {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    admin: usuario.admin
  };

  // Redirecionar para admin se for admin, ou para meus chamados se usuário comum
  if (usuario.admin) {
    return res.redirect('/admin');
  } else {
    return res.redirect('/meus-chamados');
  }
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/login');
  });
});

// Tela para cadastro de novos usuários (somente admin)
app.get('/usuarios', verificarLogin, verificarAdmin, (req, res) => {
  carregarDB();
  res.render('usuarios', { usuarios: db.usuarios, erro: null, sucesso: null });
});

// Processar cadastro de usuário novo (somente admin)
app.post('/usuarios', verificarLogin, verificarAdmin, (req, res) => {
  const { nome, email, senha, admin } = req.body;
  carregarDB();

  if (!nome || !email || !senha) {
    return res.render('usuarios', { usuarios: db.usuarios, erro: 'Todos os campos são obrigatórios.', sucesso: null });
  }

  if (db.usuarios.find(u => u.email === email)) {
    return res.render('usuarios', { usuarios: db.usuarios, erro: 'Email já cadastrado.', sucesso: null });
  }

  const novoUsuario = {
    id: db.usuarios.length ? Math.max(...db.usuarios.map(u => u.id)) + 1 : 1,
    nome,
    email,
    senha: bcrypt.hashSync(senha, 10),
    admin: admin === 'on'
  };

  db.usuarios.push(novoUsuario);
  salvarDB();

  res.render('usuarios', { usuarios: db.usuarios, erro: null, sucesso: 'Usuário criado com sucesso.' });
});

// Página inicial (formulário abrir chamado) - requer login
app.get('/', verificarLogin, (req, res) => {
  res.render('form', { success: false, usuario: req.session.usuario });
});

// Criar novo chamado - requer login
app.post('/criar-chamado', verificarLogin, (req, res) => {
  const { nome, email, assunto, subAssunto, descricao } = req.body;

  if (!nome || !email || !assunto || !subAssunto || !descricao) {
    return res.render('form', { success: false, erro: 'Todos os campos são obrigatórios.', usuario: req.session.usuario });
  }

  const prioridade = definirPrioridade(assunto, subAssunto);

  const novoChamado = {
    id: db.chamados.length ? Math.max(...db.chamados.map(c => c.id)) + 1 : 1,
    nome,
    email,
    assunto,
    subAssunto,
    descricao,
    prioridade,
    status: 'Aberto',
    dataCriacao: formatarDataBR(new Date()),
    historico: [],
    usuarioId: req.session.usuario.id
  };

  db.chamados.push(novoChamado);
  salvarDB();

  // Enviar e-mail de confirmação
  const mailOptions = {
    from: 'fernando.sbiao@gmail.com',
    to: email,
    subject: `Confirmação de Abertura de Chamado #${novoChamado.id}`,
    text: `Olá ${nome},\n\nSeu chamado foi criado com sucesso.\n\nNúmero do Chamado: #${novoChamado.id}\nAssunto: ${assunto}\nSub-Assunto: ${subAssunto}\nPrioridade: ${prioridade}\n\nEm breve entraremos em contato.\n\nObrigado!`
  };

  nodemailer.sendMail(mailOptions, (error, info) => {
    if (error) {
      console.error('Erro ao enviar e-mail:', error);
    } else {
      console.log('E-mail enviado:', info.response);
    }
  });

  res.render('form', { success: true, usuario: req.session.usuario });
});

// Página de sucesso (pode ser mantida, mas com login isso fica opcional)
app.get('/sucesso', verificarLogin, (req, res) => {
  res.render('sucesso');
});

// Página de administração (admin) - lista todos os chamados
app.get('/admin', verificarLogin, verificarAdmin, (req, res) => {
  res.render('admin', { chamados: db.chamados, usuario: req.session.usuario });
});

// Atualizar status de um chamado - admin
app.post('/atualizar-status', verificarLogin, verificarAdmin, (req, res) => {
  const { id, status, descricaoAtualizacao } = req.body;
  const chamado = db.chamados.find(c => c.id === parseInt(id));

  if (chamado) {
    chamado.status = status;
    chamado.historico.push({
      data: formatarDataBR(new Date()),
      status,
      descricao: descricaoAtualizacao?.trim() || ''
    });

    salvarDB();

    nodemailer.sendStatusUpdateEmail(
      chamado.email,
      chamado.id,
      status,
      descricaoAtualizacao
    )
      .then(info => {
        console.log('E-mail de atualização enviado:', info.response);
      })
      .catch(err => {
        console.error('Erro ao enviar e-mail de atualização:', err);
      });
  }

  res.redirect('/admin');
});

// Página para usuário comum ver seus próprios chamados
app.get('/meus-chamados', verificarLogin, (req, res) => {
  const meusChamados = db.chamados.filter(c => c.usuarioId === req.session.usuario.id);
  res.render('meus-chamados', { chamados: meusChamados, usuario: req.session.usuario });
});

// Função para definir prioridade
function definirPrioridade(assunto, subAssunto) {
  const regras = {
    'Pedidos': {
      'Integração de Pedidos': 'Alta',
      'Dúvidas / Auxílio': 'Baixa'
    },
    'Produto/Anúncio': {
      'Vínculo de produto/anúncio com erro': 'Média',
      'Dúvidas / Auxílio': 'Baixa'
    }
  };

  return (regras[assunto] && regras[assunto][subAssunto]) || 'Média';
}

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
