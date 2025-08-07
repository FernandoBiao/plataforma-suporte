const bcrypt = require('bcrypt');
const fs = require('fs');
const path = require('path');

const dbPath = path.join(__dirname, 'db.json');

function lerUsuarios() {
  const data = fs.readFileSync(dbPath);
  const json = JSON.parse(data);
  return json.usuarios || [];
}

function autenticarUsuario(email, senha, callback) {
  const usuarios = lerUsuarios();
  const usuario = usuarios.find(u => u.email === email);
  if (!usuario) return callback(null);

  bcrypt.compare(senha, usuario.senha, (err, resultado) => {
    if (err) return callback(null);
    if (resultado) {
      callback(usuario);
    } else {
      callback(null);
    }
  });
}

module.exports = { autenticarUsuario };
