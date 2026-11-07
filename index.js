const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' })); // Permitir imagens em Base64
app.use(express.static(__dirname));

// Configuração da Base de Dados PostgreSQL (Render)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Criar tabelas necessárias na BD ao iniciar
async function initDB() {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      email VARCHAR(255) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL
    );
    CREATE TABLE IF NOT EXISTS user_tokens (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      marketplace VARCHAR(50),
      api_token VARCHAR(255)
    );
    CREATE TABLE IF NOT EXISTS published_products (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      marketplace VARCHAR(50),
      titulo TEXT,
      descricao TEXT,
      preco VARCHAR(50),
      foto TEXT
    );
  `);
  console.log("Base de dados inicializada com sucesso!");
}
initDB();

// Rota de Registo
app.post('/register', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO users (email, password) VALUES ($1, $2) RETURNING id, email',
      [email, password]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(400).json({ erro: 'E-mail já registado ou erro no servidor.' });
  }
});

// Rota de Login
app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query(
      'SELECT id, email FROM users WHERE email = $1 AND password = $2',
      [email, password]
    );
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const tokensRes = await pool.query('SELECT marketplace, api_token FROM user_tokens WHERE user_id = $1', [user.id]);
      res.json({ user, tokens: tokensRes.rows });
    } else {
      res.status(401).json({ erro: 'Credenciais inválidas.' });
    }
  } catch (err) {
    res.status(500).json({ erro: 'Erro no servidor.' });
  }
});

// Guardar Token / Conta da Loja
app.post('/save-token', async (req, res) => {
  const { userId, marketplace, apiToken } = req.body;
  try {
    await pool.query('DELETE FROM user_tokens WHERE user_id = $1 AND marketplace = $2', [userId, marketplace]);
    await pool.query('INSERT INTO user_tokens (user_id, marketplace, api_token) VALUES ($1, $2, $3)', [userId, marketplace, apiToken]);
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar token.' });
  }
});

// Publicar e Guardar Produto Sincronizado
app.post('/publish-product', async (req, res) => {
  const { userId, marketplace, titulo, descricao, preco, foto } = req.body;
  try {
    await pool.query(
      'INSERT INTO published_products (user_id, marketplace, titulo, descricao, preco, foto) VALUES ($1, $2, $3, $4, $5, $6)',
      [userId, marketplace, titulo, descricao, preco, foto]
    );
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao publicar produto.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
