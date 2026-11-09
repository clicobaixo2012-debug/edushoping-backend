
const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// ==========================================
// CONFIGURAÇÕES DO MERCADO LIVRE
// ==========================================

const CLIENT_ID_ML = process.env.MERCADOLIVRE_CLIENT_ID || '5939252701115149';

const REDIRECT_URI_ML =
    process.env.MERCADOLIVRE_REDIRECT_URI ||
    'https://edushoping-backend-pro.onrender.com/auth/mercadolivre/callback';

// ==========================================
// 1. ROTA PRINCIPAL - FRONTEND
// ==========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// 2. AUTENTICAÇÃO OAUTH - MERCADO LIVRE
// ==========================================

app.get('/auth/mercadolivre', (req, res) => {
    const authUrl =
        `https://auth.mercadolivre.com.br/authorization` +
        `?response_type=code` +
        `&client_id=${CLIENT_ID_ML}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI_ML)}` +
        `&country_id=MLB`;

    res.redirect(authUrl);
});

// ==========================================
// 3. CALLBACK OAUTH
// ==========================================

app.get('/auth/mercadolivre/callback', async (req, res) => {
    const { code } = req.query;

    if (!code) {
        return res.status(400).send(
            'Código de autorização não encontrado.'
        );
    }

    try {
        if (!process.env.MERCADOLIVRE_CLIENT_SECRET) {
            throw new Error(
                'MERCADOLIVRE_CLIENT_SECRET não configurado no Render.'
            );
        }

        const params = new URLSearchParams();

        params.append('grant_type', 'authorization_code');
        params.append('client_id', CLIENT_ID_ML);
        params.append(
            'client_secret',
            process.env.MERCADOLIVRE_CLIENT_SECRET
        );
        params.append('code', code);
        params.append('redirect_uri', REDIRECT_URI_ML);

        const response = await axios.post(
            'https://api.mercadolibre.com/oauth/token',
            params,
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded'
                }
            }
        );

        const accessToken = response.data.access_token;
        const userId = response.data.user_id;

        console.log('Conta Mercado Livre conectada:', userId);

        res.send(`
            <!DOCTYPE html>
            <html lang="pt-BR">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Autenticação Concluída</title>
            </head>

            <body style="
                background:#0b0f19;
                color:#fff;
                font-family:Arial;
                text-align:center;
                padding-top:50px;
            ">

                <h1 style="color:#00e676;">
                    Loja conectada com sucesso!
                </h1>

                <p>Mercado Livre conectado ao EduShopping.</p>

                <p>User ID: <strong>${userId}</strong></p>

                <p>Redirecionando para a central...</p>

                <script>
                    localStorage.setItem(
                        'ml_access_token',
                        ${JSON.stringify(accessToken)}
                    );

                    localStorage.setItem(
                        'ml_user_id',
                        ${JSON.stringify(String(userId))}
                    );

                    setTimeout(() => {
                        window.location.href = '/';
                    }, 1500);
                </script>

            </body>
            </html>
        `);

    } catch (error) {
        console.error(
            'Erro detalhado OAuth:',
            error.response?.data || error.message
        );

        res.status(500).send(
            'Erro na autenticação com o Mercado Livre: ' +
            JSON.stringify(error.response?.data || error.message)
        );
    }
});

// ==========================================
// 4. ROTA DE NOTIFICAÇÕES - WEBHOOK
// ==========================================

app.post('/auth/mercadolivre/notifications', (req, res) => {
    console.log(
        'Notificação recebida do Mercado Livre:',
        req.body
    );

    return res.status(200).send('Notification received');
});

// ==========================================
// 5. PUBLICAÇÃO DE PRODUTOS NO MERCADO LIVRE
// ==========================================

app.post('/api/publicar/mercadolivre', async (req, res) => {

    const {
        title,
        family_name,
        price,
        description,
        accessToken,
        sku,
        brand,
        model,
        category_id,
        image
    } = req.body;

    console.log(
        'Recebido pedido para publicar:',
        title || family_name
    );

    // --------------------------------------
    // VALIDAR TOKEN
    // --------------------------------------

    if (!accessToken) {
        return res.status(401).json({
            success: false,
            message: 'Não autenticado no Mercado Livre. Conecte sua conta primeiro!'
        });
    }

    // --------------------------------------
    // VALIDAR NOME DO PRODUTO
    // --------------------------------------

    const nomeFamilia = String(
        family_name || title || ''
    ).trim();

    if (!nomeFamilia) {
        return res.status(400).json({
            success: false,
            message: 'O nome do produto é obrigatório.'
        });
    }

    // --------------------------------------
    // VALIDAR PREÇO
    // --------------------------------------

    const preco = Number(price);

    if (!Number.isFinite(preco) || preco <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Informe um preço válido.'
        });
    }

    // --------------------------------------
    // DEFINIR CATEGORIA
    // --------------------------------------

    const categoria = category_id || 'MLB271599';

    // --------------------------------------
    // MONTAR ATRIBUTOS
    // --------------------------------------

    const atributos = [
        {
            id: 'BRAND',
            value_name: brand || 'Genérica'
        },
        {
            id: 'MODEL',
            value_name: model || 'Padrão'
        },
        {
            id: 'SELLER_SKU',
            value_name: sku || `SKU-${Date.now()}`
        }
    ];

    // --------------------------------------
    // MONTAR IMAGEM
    // --------------------------------------

    const imagens = image
        ? [{ source: image }]
        : [
            {
                source: 'https://http2.mlstatic.com/D_NQ_NP_917305-MLB43954602951_102020-O.jpg'
            }
        ];

    // --------------------------------------
    // MONTAR DADOS DO ANÚNCIO
    // --------------------------------------

    const payload = {
        family_name: nomeFamilia,

        category_id: categoria,

        price: preco,
        currency_id: 'BRL',

        available_quantity: 5,

        buying_mode: 'buy_it_now',

        listing_type_id: 'gold_special',

        condition: 'new',

        pictures: imagens,

        attributes: atributos
    };

    try {

        // ----------------------------------
        // PUBLICAR PRODUTO
        // ----------------------------------

        console.log(
            'Enviando produto para o Mercado Livre...'
        );

        const response = await axios.post(
            'https://api.mercadolibre.com/items',
            payload,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                    'Content-Type': 'application/json'
                },
                timeout: 30000
            }
        );

        const item = response.data;

        console.log(
            'Produto publicado com sucesso:',
            item.id
        );

        // ----------------------------------
        // CADASTRAR DESCRIÇÃO SEPARADAMENTE
        // ----------------------------------

        let descricaoStatus = 'não informada';
        let avisoDescricao = null;

        if (
            typeof description === 'string' &&
            description.trim()
        ) {
            try {

                await axios.post(
                    `https://api.mercadolibre.com/items/${item.id}/description`,
                    {
                        plain_text: description.trim()
                    },
                    {
                        headers: {
                            Authorization: `Bearer ${accessToken}`,
                            'Content-Type': 'application/json'
                        },
                        timeout: 30000
                    }
                );

                descricaoStatus = 'publicada';

                console.log(
                    'Descrição cadastrada com sucesso.'
                );

            } catch (descriptionError) {

                console.error(
                    'Erro ao cadastrar descrição:',
                    descriptionError.response?.data ||
                    descriptionError.message
                );

                descricaoStatus = 'pendente';

                avisoDescricao =
                    descriptionError.response?.data ||
                    descriptionError.message;
            }
        }

        // ----------------------------------
        // RETORNAR RESULTADO
        // ----------------------------------

        return res.status(201).json({
            success: true,

            message: 'Produto publicado no Mercado Livre!',

            item: item,

            descricao: descricaoStatus,

            aviso_descricao: avisoDescricao
        });

    } catch (error) {

        // ----------------------------------
        // TRATAR ERROS DO MERCADO LIVRE
        // ----------------------------------

        const mlErrorData =
            error.response?.data || error.message;

        const statusCode =
            error.response?.status || 500;

        console.error(
            'ERRO COMPLETO DO MERCADO LIVRE:',
            JSON.stringify(mlErrorData, null, 2)
        );

        return res.status(statusCode).json({

            success: false,

            message: 'Erro ao publicar produto no Mercado Livre.',

            details: mlErrorData

        });
    }
});

// ==========================================
// 6. INICIALIZAÇÃO DO SERVIDOR
// ==========================================

app.listen(PORT, () => {

    console.log(
        '======================================'
    );

    console.log(
        'EduShopping Backend iniciado!'
    );

    console.log(
        'Servidor rodando na porta ' + PORT
    );

    console.log(
        'Integração Mercado Livre disponível.'
    );

    console.log(
        '======================================'
    );

});
