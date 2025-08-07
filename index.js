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

// Carregar chamados existentes
let chamados = [];
if (fs.existsSync(chamadosFile)) {
  chamados = JSON.parse(fs.readFileSync(chamadosFile));
}

// Página inicial (abrir chamado)
app.get('/', (req, res) => {
  res.render('form', { success: false });
});

// Página do admin
app.get('/admin', (req, res) => {
  res.render('admin', { chamados });
});

// Página de sucesso após criação de chamado
app.get('/sucesso', (req, res) => {
  res.render('sucesso');
});

// Criar novo chamado
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
    dataCriacao: new Date().toLocaleString(),
    historico: []
  };

  chamados.push(novoChamado);
  fs.writeFileSync(chamadosFile, JSON.stringify(chamados, null, 2));

  // Enviar e-mail de confirmação
  const mailOptions = {
    from: 'seu-email@dominio.com', // Trocar pelo seu e-mail real
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

  // Redirecionar para página de sucesso
  res.redirect('/sucesso');
});

// Atualizar status de um chamado
app.post('/atualizar-status', (req, res) => {
  const { id, status, descricaoAtualizacao } = req.body;
  const chamado = chamados.find(c => c.id === parseInt(id));
  if (chamado) {
    chamado.status = status;
    if (descricaoAtualizacao && descricaoAtualizacao.trim() !== '') {
      chamado.historico.push({
        data: new Date().toLocaleString(),
        status,
        descricao: descricaoAtualizacao.trim()
      });
    } else {
      chamado.historico.push({
        data: new Date().toLocaleString(),
        status,
        descricao: ''
      });
    }
    fs.writeFileSync(chamadosFile, JSON.stringify(chamados, null, 2));

    // Enviar e-mail de atualização para o criador
    nodemailer.sendStatusUpdateEmail(chamado.email, chamado.id, status, descricaoAtualizacao)
      .then(info => {
        console.log('E-mail de atualização enviado:', info.response);
      })
      .catch(err => {
        console.error('Erro ao enviar e-mail de atualização:', err);
      });
  }
  res.redirect('/admin');
});

// Função para definir prioridade com base no assunto e sub-assunto
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
