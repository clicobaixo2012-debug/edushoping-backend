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
// 1. ROTA DE REDIRECIONAMENTO OAUTH (Novo Client ID)
// ==========================================
app.get('/auth/mercadolivre', (req, res) => {
    const CLIENT_ID_ML = process.env.MERCADOLIVRE_CLIENT_ID || '5939252701115149';
    const REDIRECT_URI_ML = 'https://edushoping-backend-pro.onrender.com/auth/mercadolivre/callback';
    
    // Endpoint nacional do Brasil para garantir compatibilidade total
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID_ML}&redirect_uri=${encodeURIComponent(REDIRECT_URI_ML)}&country_id=MLB`;
    
    return res.redirect(authUrl);
});

// ==========================================
// 2. ROTA DE CALLBACK OAUTH (Novas Credenciais)
// ==========================================
app.get('/auth/mercadolivre/callback', async (req, res) => {
    const { code } = req.query;
    if (!code) return res.status(400).send('Código de autorização não encontrado.');
    
    try {
        const REDIRECT_URI_ML = 'https://edushoping-backend-pro.onrender.com/auth/mercadolivre/callback';
        const CLIENT_ID_ML = process.env.MERCADOLIVRE_CLIENT_ID || '5939252701115149';

        const response = await axios.post('https://api.mercadolibre.com/oauth/token', null, {
            params: {
                grant_type: 'authorization_code',
                client_id: CLIENT_ID_ML,
                client_secret: process.env.MERCADOLIVRE_CLIENT_SECRET,
                code: code,
                redirect_uri: REDIRECT_URI_ML
            }
        });
        
        const accessToken = response.data.access_token;

        res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head><meta charset="UTF-8"><title>Autenticação Concluída</title></head>
            <body style="background:#0b0f19; color:#fff; font-family:Arial; text-align:center; padding-top:50px;">
                <h2>Loja conectada com sucesso ao Mercado Livre!</h2>
                <p>A guardar credenciais e a redirecionar...</p>
                <script>
                    localStorage.setItem('ml_access_token', '${accessToken}');
                    setTimeout(() => { window.location.href = '/'; }, 2000);
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Erro detalhado OAuth:', error.response?.data || error.message);
        res.status(500).send('Erro na autenticação com o Mercado Livre.');
    }
});

// ==========================================
// 3. ROTA DE NOTIFICAÇÕES (WEBHOOK)
// ==========================================
app.post('/auth/mercadolivre/notifications', (req, res) => {
    console.log('Notificação recebida do Mercado Livre:', req.body);
    return res.status(200).send('Notification received');
});

// ==========================================
// 4. ROTA DE PUBLICAÇÃO DE ANÚNCIOS
// ==========================================
app.post('/api/publicar/mercadolivre', async (req, res) => {
    const { title, price, description, accessToken } = req.body;

    if (!accessToken) {
        return res.status(401).json({ 
            success: false, 
            message: 'Não autenticado no Mercado Livre. Conecte a sua conta primeiro!' 
        });
    }

    try {
        const payload = {
            title: title,
            category_id: "MLB3530",
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

        const response = await axios.post('https://api.mercadolibre.com/items', payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        res.json({ success: true, item: response.data });
    } catch (error) {
        console.error('Erro ao publicar anúncio:', error.response?.data || error.message);
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao criar anúncio no Mercado Livre', 
            details: error.response?.data 
        });
    }
});

app.listen(PORT, () => {
    console.log('Servidor rodando na porta ' + PORT);
});
