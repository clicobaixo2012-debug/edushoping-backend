const express = require('express');
const axios = express ? require('axios') : null;
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
// 1. ROTA DE REDIRECIONAMENTO OAUTH
// ==========================================
app.get('/auth/mercadolivre', (req, res) => {
    const CLIENT_ID_ML = process.env.MERCADOLIVRE_CLIENT_ID || '5939252701115149';
    const REDIRECT_URI_ML = 'https://edushoping-backend-pro.onrender.com/auth/mercadolivre/callback';
    
    const authUrl = `https://auth.mercadolivre.com.br/authorization?response_type=code&client_id=${CLIENT_ID_ML}&redirect_uri=${encodeURIComponent(REDIRECT_URI_ML)}&country_id=MLB`;
    
    return res.redirect(authUrl);
});

// ==========================================
// 2. ROTA DE CALLBACK OAUTH
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
        const userId = response.data.user_id;

        res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <title>Autenticação Concluída</title>
            </head>
            <body style="background:#0b0f19; color:#fff; font-family:Arial; text-align:center; padding-top:50px;">
                <h1 style="color:#00e676;">Loja conectada com sucesso ao Mercado Livre!</h1>
                <p>User ID: <strong>${userId}</strong></p>
                <p>A guardar credenciais e a redirecionar para a central...</p>
                <script>
                    localStorage.setItem('ml_access_token', '${accessToken}');
                    localStorage.setItem('ml_user_id', '${userId}');
                    setTimeout(() => { window.location.href = '/'; }, 1500);
                </script>
            </body>
            </html>
        `);
    } catch (error) {
        console.error('Erro detalhado OAuth:', error.response?.data || error.message);
        res.status(500).send('Erro na autenticação com o Mercado Livre: ' + JSON.stringify(error.response?.data || error.message));
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
// 4. ROTA DE PUBLICAÇÃO DE ANÚNCIOS (Categoria Flexível)
// ==========================================
app.post('/api/publicar/mercadolivre', async (req, res) => {
    const { title, price, description, accessToken, sku, brand, model } = req.body;

    console.log('Recebido pedido para publicar no ML. Título:', title);

    if (!accessToken) {
        console.log('Erro: Token não fornecido.');
        return res.status(401).json({ 
            success: false, 
            message: 'Não autenticado no Mercado Livre. Conecte a sua conta primeiro!' 
        });
    }

    try {
        const payload = {
            title: title || "Produto Genérico para Teste",
            category_id: "MLB271599", // Categoria alternativa mais aberta para testes de API
            price: parseFloat(price) || 29.90,
            currency_id: "BRL",
            available_quantity: 5,
            buying_mode: "buy_it_now",
            listing_type_id: "gold_special", 
            condition: "new",
            description: {
                plain_text: description || "Produto de excelente qualidade, pronto para entrega."
            },
            pictures: [
                { source: "https://http2.mlstatic.com/D_NQ_NP_917305-MLB43954602951_102020-O.jpg" }
            ],
            attributes: [
                {
                    id: "BRAND",
                    value_name: brand || "Genérica"
                },
                {
                    id: "MODEL",
                    value_name: model || "Padrão"
                },
                {
                    id: "SELLER_SKU",
                    value_name: sku || `SKU-${Date.now()}`
                }
            ]
        };

        const response = await axios.post('https://api.mercadolibre.com/items', payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            }
        });

        console.log('Sucesso ao publicar item:', response.data.id);
        res.json({ success: true, item: response.data });
    } catch (error) {
        const mlErrorData = error.response?.data || error.message;
        console.error('ERRO COMPLETO DO MERCADO LIVRE:', JSON.stringify(mlErrorData, null, 2));
        
        res.status(500).json({ 
            success: false, 
            message: 'Erro ao criar anúncio no Mercado Livre', 
            details: mlErrorData 
        });
    }
});

app.listen(PORT, () => {
    console.log('Servidor rodando na porta ' + PORT);
});
