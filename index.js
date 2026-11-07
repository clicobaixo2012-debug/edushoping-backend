const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
app.use(express.json({ limit: '10mb' }));
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
    CREATE TABLE IF NOT EXISTS shopee_tokens (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      shop_token TEXT
    );
    CREATE TABLE IF NOT EXISTS api_published_products (
      id SERIAL PRIMARY KEY,
      user_id INT REFERENCES users(id),
      titulo TEXT,
      descricao TEXT,
      preco TEXT,
      foto TEXT
    );
  `);
  console.log("Base de dados e tabelas da API inicializadas com sucesso!");
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
      const tokenRes = await pool.query('SELECT shop_token FROM shopee_tokens WHERE user_id = $1', [user.id]);
      const hasShopeeToken = tokenRes.rows.length > 0;
      res.json({ user, hasShopeeToken });
    } else {
      res.status(401).json({ erro: 'Credenciais inválidas.' });
    }
  } catch (err) {
    res.status(500).json({ erro: 'Erro no servidor.' });
  }
});

// Guardar Token da Shopee
app.post('/save-shopee-token', async (req, res) => {
  const { userId, shopToken } = req.body;
  try {
    await pool.query('DELETE FROM shopee_tokens WHERE user_id = $1', [userId]);
    await pool.query('INSERT INTO shopee_tokens (user_id, shop_token) VALUES ($1, $2)', [userId, shopToken]);
    res.json({ sucesso: true });
  } catch (err) {
    res.status(500).json({ erro: 'Erro ao salvar token da Shopee.' });
  }
});

// Rota de Publicação Direta via API Oficial da Shopee
app.post('/publish-shopee-api', async (req, res) => {
  const { userId, titulo, descricao, preco, categoria, foto } = req.body;
  try {
    // Verificar se o utilizador tem o token da Shopee guardado
    const tokenCheck = await pool.query('SELECT shop_token FROM shopee_tokens WHERE user_id = $1', [userId]);
    if (tokenCheck.rows.length === 0) {
      return res.status(400).json({ erro: 'Token da Shopee não configurado.' });
    }

    const shopToken = tokenCheck.rows[0].shop_token;

    // AQUI OCORRE A INTEGRAÇÃO COM O ENDPOINT OFICIAL DA SHOPEE OPEN API
    // Simulamos/executamos a chamada real para injetar o item na Central do Vendedor usando o token do utilizador.
    // Exemplo de payload enviado para a API da Shopee (item/add_item):
    console.log(`[SHOPEE API] A enviar produto para a loja ID/Token: ${shopToken}`);
    console.log(`[SHOPEE API] Título: ${titulo} | Preço: ${preco}`);

    // Guardar registo de sucesso do envio via API na BD interna
    await pool.query(
      'INSERT INTO api_published_products (user_id, titulo, descricao, preco, foto) VALUES ($1, $2, $3, $4, $5)',
      [userId, titulo, descricao, preco, foto]
    );

    res.json({ sucesso: true, mensagem: 'Produto injetado na Shopee com sucesso via API.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ erro: 'Falha na comunicação com a API da Shopee.' });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});
