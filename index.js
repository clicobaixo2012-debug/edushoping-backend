const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve o ficheiro index.html na raiz do site
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota de callback do Mercado Livre
app.get('/auth/mercadolivre/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Código não encontrado.');
    try {
        const response = await axios.post('https://api.mercadolibre.com/oauth/token', null, {
            params: {
                grant_type: 'authorization_code',
                client_id: process.env.MERCADOLIVRE_CLIENT_ID,
                client_secret: process.env.MERCADOLIVRE_CLIENT_SECRET,
                code: code,
                redirect_uri: process.env.MERCADOLIVRE_REDIRECT_URI
            }
        });
        res.send('Autenticação com o Mercado Livre realizada com sucesso!');
    } catch (error) {
        res.status(500).send('Erro ao autenticar.');
    }
});

app.listen(PORT, () => {
    console.log('Servidor a correr na porta ' + PORT);
});
