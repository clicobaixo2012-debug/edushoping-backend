// ==========================================
// 4. ROTA DE PUBLICAÇÃO DE ANÚNCIOS (Com Family Name Estruturado)
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
            category_id: "MLB157436", 
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
                    id: "FAMILY_NAME",
                    value_name: "Outros"
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
