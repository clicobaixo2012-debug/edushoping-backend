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

// Criar tabelas necessárias
pool.query(`
  CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_tokens (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    marketplace VARCHAR(50) NOT NULL,
    api_token VARCHAR(255) NOT NULL,
    UNIQUE(user_id, marketplace)
  );
`).then(() => {
  console.log("Tabelas 'users' e 'user_tokens' verificadas/criadas com sucesso!");
}).catch(err => {
  console.error("Erro ao criar tabelas:", err);
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

    // Buscar também os tokens deste utilizador
    const tokens = await pool.query('SELECT marketplace, api_token FROM user_tokens WHERE user_id = $1', [user.rows[0].id]);

    res.json({ 
      mensagem: 'Login efetuado com sucesso!', 
      user: { id: user.rows[0].id, email: user.rows[0].email },
      tokens: tokens.rows
    });
  } catch (error) {
    res.status(500).json({ erro: 'Erro ao fazer login.' });
  }
});

// Guardar ou atualizar token de marketplace
app.post('/save-token', async (req, res) => {
  const { userId, marketplace, apiToken } = req.body;
  try {
    await pool.query(`
      INSERT INTO user_tokens (user_id, marketplace, api_token) 
      VALUES ($1, $2, $3)
      ON CONFLICT (user_id, marketplace) 
      DO UPDATE SET api_token = $3
    `, [userId, marketplace, apiToken]);

    res.json({ mensagem: 'Token guardado com sucesso no banco de dados!' });
  } catch (error) {
    console.error(error);
    res.status(500).json({ erro: 'Erro ao salvar token.' });
  }
});

const PORT = process.env.PORT || 10000;
app.listen(PORT, () => {
  console.log(`Servidor edushoping a rodar na porta ${PORT}`);
});
