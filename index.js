const express = require('express');
const axios = axios ? require('axios') : require('axios');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: '10mb' }));

// ==========================================
// CONFIGURAÇÕES DO MERCADO LIVRE
// ==========================================

const CLIENT_ID_ML =
    process.env.MERCADOLIVRE_CLIENT_ID || '5939252701115149';

const REDIRECT_URI_ML =
    process.env.MERCADOLIVRE_REDIRECT_URI ||
    'https://edushoping-backend-pro.onrender.com/auth/mercadolivre/callback';

// ==========================================
// FUNÇÃO: LIMITAR FAMILY_NAME A 60 CARACTERES
// ==========================================

function limitarFamilyName(valor) {
    return Array.from(
        String(valor || '').trim()
    ).slice(0, 60).join('');
}

// ==========================================
// FUNÇÃO: DESCOBRIR CATEGORIA FOLHA AUTOMATICAMENTE
// ==========================================

async function descobrirCategoria(termoBusca, accessToken) {
    try {
        const query = termoBusca || "produto geral";
        const response = await axios.get(
            `https://api.mercadolibre.com/sites/MLB/domain_discovery/search?q=${encodeURIComponent(query)}`,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`
                },
                timeout: 10000
            }
        );

        if (response.data && response.data.length > 0 && response.data[0].category_id) {
            console.log('Categoria descoberta automaticamente:', response.data[0].category_id);
            return response.data[0].category_id;
        }
    } catch (error) {
        console.warn('Aviso: Não foi possível descobrir a categoria automaticamente. Usando padrão.', error.message);
    }
    // Fallback para uma categoria válida garantida caso a busca falhe
    return 'MLB1648'; 
}

// ==========================================
// 1. ROTA PRINCIPAL
// ==========================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ==========================================
// 2. AUTENTICAÇÃO OAUTH
// ==========================================

app.get('/auth/mercadolivre', (req, res) => {
    const authUrl =
        'https://auth.mercadolibre.com.br/authorization' +
        '?response_type=code' +
        '&client_id=' + encodeURIComponent(CLIENT_ID_ML) +
        '&redirect_uri=' + encodeURIComponent(REDIRECT_URI_ML) +
        '&country_id=MLB';

    res.redirect(authUrl);
});

// ==========================================
// 3. CALLBACK OAUTH
// ==========================================

app.get('/auth/mercadolivre/callback', async (req, res) => {
    const { code, error, error_description } = req.query;

    if (error) {
        return res.status(400).send(
            'Autorização não concluída: ' +
            String(error_description || error)
        );
    }

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
                },
                timeout: 30000
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

        res.status(error.response?.status || 500).send(
            'Erro na autenticação com o Mercado Livre: ' +
            JSON.stringify(error.response?.data || error.message)
        );
    }
});

// ==========================================
// 4. NOTIFICAÇÕES WEBHOOK
// ==========================================

app.post('/auth/mercadolivre/notifications', (req, res) => {
    console.log(
        'Notificação recebida do Mercado Livre:',
        req.body
    );

    return res.status(200).send('Notification received');
});

// ==========================================
// 5. PUBLICAÇÃO DE PRODUTOS
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

    if (
        !accessToken ||
        typeof accessToken !== 'string'
    ) {
        return res.status(401).json({
            success: false,
            message: 'Não autenticado no Mercado Livre. Conecte sua conta primeiro!'
        });
    }

    // --------------------------------------
    // CORRIGIR E LIMITAR FAMILY_NAME
    // --------------------------------------

    const nomeOriginal = String(
        family_name || title || 'Produto'
    ).trim();

    const nomeFamilia = limitarFamilyName(nomeOriginal);

    if (!nomeFamilia) {
        return res.status(400).json({
            success: false,
            message: 'O nome da família do produto é obrigatório.'
        });
    }

    // --------------------------------------
    // VALIDAR E CONVERTER PREÇO
    // --------------------------------------

    let precoTexto = String(price ?? '').trim();

    if (precoTexto.includes(',')) {
        precoTexto = precoTexto
            .replace(/\./g, '')
            .replace(',', '.');
    }

    const preco = Number(precoTexto);

    if (!Number.isFinite(preco) || preco <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Informe um preço válido para o produto.'
        });
    }

    // --------------------------------------
    // VALIDAR OU DESCOBRIR CATEGORIA
    // --------------------------------------

    let categoria = category_id;
    if (!categoria || categoria.startsWith('MLB2715')) {
        // Se não veio categoria ou se era aquela genérica antiga, descobre via domain_discovery
        categoria = await descobrirCategoria(title || family_name, accessToken);
    }

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
    // MONTAR IMAGENS (Garantindo imagem válida)
    // --------------------------------------

    const imagens = image && image.startsWith('http')
        ? [{ source: image }]
        : [
            {
                source: 'https://http2.mlstatic.com/D_NQ_NP_917305-MLB43954602951_102020-O.jpg'
            }
        ];

    // --------------------------------------
    // MONTAR PAYLOAD
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

        console.log('Enviando produto para o Mercado Livre...');
        console.log('Categoria final utilizada:', categoria);
        console.log('Family Name:', nomeFamilia, '| Caracteres:', Array.from(nomeFamilia).length);

        // ----------------------------------
        // PUBLICAR PRODUTO
        // ----------------------------------

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

        console.log('Produto publicado com sucesso:', item.id);

        // ----------------------------------
        // CADASTRAR DESCRIÇÃO
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

                console.log('Descrição cadastrada com sucesso.');

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
            aviso_descricao: avisoDescricao,
            family_name_enviado: nomeFamilia,
            caracteres_family_name: Array.from(nomeFamilia).length,
            categoria_utilizada: categoria
        });

    } catch (error) {

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

    console.log('======================================');
    console.log('EduShopping Backend iniciado!');
    console.log('Servidor rodando na porta ' + PORT);
    console.log('Integração Mercado Livre disponível.');
    console.log('======================================');

});
