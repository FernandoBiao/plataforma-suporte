const express = require('express');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const mailer = require('./mailer');

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

// Página inicial (abrir chamado)
app.get('/', (req, res) => {
  res.render('form', { success: false });
});

// Página do admin
app.get('/admin', (req, res) => {
  res.render('admin', { chamados });
});

// Criar novo chamado
app.post('/criar-chamado', (req, res) => {
  const { nome, email, subject, subSubject, description } = req.body;

  const prioridade = definirPrioridade(subject, subSubject);

  const novoChamado = {
    id: chamados.length + 1,
    nome,
    email,
    assunto: subject,
    subAssunto: subSubject,
    descricao: description,
    prioridade,
    status: 'Aberto',
    dataCriacao: new Date().toLocaleString(),
    historico: []
  };

  chamados.push(novoChamado);
  fs.writeFileSync(chamadosFile, JSON.stringify(chamados, null, 2));

  // Enviar e-mail de confirmação para o criador
  const mailOptions = {
    from: 'seu-email@dominio.com', // ajuste aqui
    to: email,
    subject: `Confirmação de Abertura de Chamado #${novoChamado.id}`,
    text: `Olá ${nome},\n\nSeu chamado foi criado com sucesso.\n\nNúmero do Chamado: #${novoChamado.id}\nAssunto: ${subject}\nSub-Assunto: ${subSubject}\nPrioridade: ${prioridade}\n\nEm breve entraremos em contato.\n\nObrigado!`
  };

  mailer.sendMail(mailOptions).catch(console.error);

  res.render('form', { success: true });
});

// Atualizar status de um chamado com descrição
app.post('/atualizar-status', (req, res) => {
  const { id, status, descricaoAtualizacao } = req.body;
  const chamado = chamados.find(c => c.id === parseInt(id));
  if (chamado) {
    chamado.status = status;
    if (descricaoAtualizacao && descricaoAtualizacao.trim() !== '') {
      chamado.historico.push({
        data: new Date().toLocaleString(),
        status,
        descricao: descricaoAtualizacao
      });
    }
    fs.writeFileSync(chamadosFile, JSON.stringify(chamados, null, 2));

    // Enviar e-mail de atualização para o criador do chamado
    const mailOptions = {
      from: 'seu-email@dominio.com', // ajuste aqui
      to: chamado.email,
      subject: `Atualização do seu chamado #${chamado.id}`,
      text: `Olá ${chamado.nome},\n\nO status do seu chamado #${chamado.id} foi atualizado para: ${status}.\n\nDescrição da atualização:\n${descricaoAtualizacao || 'Nenhuma descrição fornecida.'}\n\nObrigado!`
    };

    mailer.sendMail(mailOptions).catch(console.error);
  }
  res.redirect('/admin');
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
