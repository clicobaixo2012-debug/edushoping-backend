const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  )
`).then(() => {
  console.log("Tabela 'users' verificada/criada com sucesso!");
}).catch(err => {
  console.error("Erro ao criar tabela:", err);
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const newUser = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email, created_at',
      [email, password]
    );
    res.status(201).json({ mensagem: 'Utilizador registado com sucesso!', user: newUser.rows[0] });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao registar utilizador (talvez o email já exista).' });
  }
});

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (user.rows.length === 0) {
      return res.status(404).json({ erro: 'Utilizador não encontrado.' });
    }

    if (user.rows[0].password !== password) {
      return res.status(401).json({ erro: 'Senha incorreta.' });
    }

    res.json({ mensagem: 'Login efetuado com sucesso!', user: { id: user.rows[0].id, email: user.rows[0].email } });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao fazer login.' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor edushoping a rodar na porta ${PORT}`);
});
