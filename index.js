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

// Função para formatar data no padrão brasileiro com hora
function formatarDataBR(data) {
  return data.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

// Carregar chamados existentes com tratamento de erro
let chamados = [];
if (fs.existsSync(chamadosFile)) {
  try {
    const data = fs.readFileSync(chamadosFile, 'utf8');
    chamados = data ? JSON.parse(data) : [];
  } catch (err) {
    console.error('Erro ao ler arquivo chamados.json:', err);
    chamados = [];
  }
}

// Página inicial (formulário)
app.get('/', (req, res) => {
  res.render('form', { success: false });
});

// Página de sucesso
app.get('/sucesso', (req, res) => {
  res.render('sucesso');
});

// Página de administração
app.get('/admin', (req, res) => {
  res.render('admin', { chamados });
});

// Criar novo chamado
app.post('/criar-chamado', (req, res) => {
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
    dataCriacao: formatarDataBR(new Date()),
    historico: []
  };

  chamados.push(novoChamado);

  try {
    fs.writeFileSync(chamadosFile, JSON.stringify(chamados, null, 2));
  } catch (err) {
    console.error('Erro ao salvar arquivo chamados.json:', err);
    return res.status(500).send('Erro interno ao salvar chamado.');
  }

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

  res.redirect('/sucesso');
});

// Atualizar status de um chamado
app.post('/atualizar-status', (req, res) => {
  const { id, status, descricaoAtualizacao } = req.body;
  const chamado = chamados.find(c => c.id === parseInt(id));
  if (chamado) {
    chamado.status = status;
    chamado.historico.push({
      data: formatarDataBR(new Date()),
      status,
      descricao: descricaoAtualizacao?.trim() || ''
    });

    try {
      fs.writeFileSync(chamadosFile, JSON.stringify(chamados, null, 2));
    } catch (err) {
      console.error('Erro ao salvar arquivo chamados.json:', err);
      return res.status(500).send('Erro interno ao salvar atualização.');
    }

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
