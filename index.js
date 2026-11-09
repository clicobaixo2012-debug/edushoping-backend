const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Serve o frontend
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// NOVA ROTA: Redirecionamento OAuth via Servidor
// ==========================================
app.get('/auth/mercadolivre', (req, res) => {
    const CLIENT_ID_ML = '231788362649193';
    // Constrói a redirect_uri dinamicamente com base no Render
    const REDIRECT_URI_ML = `${req.protocol}://${req.get('host')}/auth/mercadolivre/callback`;
    
    // Força o redirecionamento diretamente do backend com o country_id travado no Brasil
    const authUrl = `https://auth.mercadolivre.com/authorization?response_type=code&client_id=${CLIENT_ID_ML}&redirect_uri=${encodeURIComponent(REDIRECT_URI_ML)}&country_id=MLB`;
    
    return res.redirect(authUrl);
});

// Rota de callback OAuth do Mercado Livre
app.get('/auth/mercadolivre/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Código de autorização não encontrado.');
    
    try {
        const REDIRECT_URI_ML = `${req.protocol}://${req.get('host')}/auth/mercadolivre/callback`;
        const response = await axios.post('https://api.mercadolibre.com/oauth/token', null, {
            params: {
                grant_type: 'authorization_code',
                client_id: process.env.MERCADOLIVRE_CLIENT_ID || '231788362649193',
                client_secret: process.env.MERCADOLIVRE_CLIENT_SECRET,
                code: code,
                redirect_uri: process.env.MERCADOLIVRE_REDIRECT_URI || REDIRECT_URI_ML
            }
        });
        
        // Em produção, guarda o access_token retornado
        res.send('Autenticação com o Mercado Livre realizada com sucesso! Pode fechar esta página.');
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).send('Erro na autenticação com Mercado Livre.');
    }
});

// Rota para publicar o anúncio no Mercado Livre
app.post('/api/publicar/mercadolivre', async (req, res) => {
    const { title, price, description, accessToken } = req.body;

    if (!accessToken) {
        return res.status(401).json({ 
            success: false, 
            message: 'Não autenticado no Mercado Livre. Conecte a sua conta no Passo 1 primeiro!' 
        });
    }

    try {
        const payload = {
            title: title,
            category_id: "MLB3530", // Categoria genérica / Calçados e Acessórios
            price: parseFloat(price),
            currency_id: "BRL",
            available_quantity: 10,
            buying_mode: "buy_it_now",
            listing_type_id: "gold_special",
            condition: "new",
            description: {
                plain_text: description
            }
        };

        const response = await axios.post('https://api.mercadolivre.com/items', payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({ success: true, item: response.data });
    } catch (error) {
        console.error(error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao criar anúncio no Mercado Livre', 
            details: error.response?.data 
        });
    }
});

app.listen(PORT, () => {
    console.log('Servidor a correr na porta ' + PORT);
});
