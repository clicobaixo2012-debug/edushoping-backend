require('dotenv').config();
const express = require('express');
const multer = require('multer');
const axios = require('axios');
const crypto = require('crypto');
const fs = require('fs');

const app = express();
const upload = multer({ dest: 'uploads/' });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(__dirname));

const SHOPEE_PARTNER_ID = parseInt(process.env.SHOPEE_PARTNER_ID || '123456');
const SHOPEE_PARTNER_KEY = process.env.SHOPEE_PARTNER_KEY || 'sua_partner_key';
const SHOPEE_HOST = 'https://partner.shopeemobile.com';

// Memória temporária para armazenar o token OAuth ativo da loja conectada
let dbTokens = { 
  shopee: { access_token: '', shop_id: 0 } 
};

// Rota de Início de Login OAuth 2.0 da Shopee
app.get('/auth/shopee', (req, res) => {
  const path = '/api/v2/shop/auth_partner';
  const ts = Math.floor(Date.now() / 1000);
  
  const sign = crypto
    .createHmac('sha256', SHOPEE_PARTNER_KEY)
    .update(`${SHOPEE_PARTNER_ID}${path}${ts}`)
    .digest('hex');

  const redirectUrl = `${SHOPEE_HOST}${path}?partner_id=${SHOPEE_PARTNER_ID}&timestamp=${ts}&sign=${sign}&redirect=http://localhost:3000/callback/shopee`;
  res.redirect(redirectUrl);
});

// Rota de Callback (Retorno da Autenticação OAuth da Shopee)
app.get('/callback/shopee', async (req, res) => {
  const { code, shop_id } = req.query;
  const path = '/api/v2/auth/token/get';
  const ts = Math.floor(Date.now() / 1000);

  const sign = crypto
    .createHmac('sha256', SHOPEE_PARTNER_KEY)
    .update(`${SHOPEE_PARTNER_ID}${path}${ts}`)
    .digest('hex');

  try {
    const tokenRes = await axios.post(`${SHOPEE_HOST}${path}?partner_id=${SHOPEE_PARTNER_ID}&timestamp=${ts}&sign=${sign}`, {
      code: code,
      partner_id: SHOPEE_PARTNER_ID,
      shop_id: parseInt(shop_id)
    });

    dbTokens.shopee = {
      access_token: tokenRes.data.access_token,
      shop_id: parseInt(shop_id)
    };

    res.send("<h2>Loja Shopee conectada com sucesso! Podes fechar esta aba e voltar ao SaaS.</h2>");
  } catch (err) {
    res.status(500).send("Erro ao obter o token de acesso da Shopee: " + (err.response?.data?.message || err.message));
  }
});

// Endpoint Principal de Publicação Direta (Faz upload da imagem para a CDN e cria o item na Shopee)
app.post('/api/publish', upload.single('image'), async (req, res) => {
  try {
    const { title, description, price } = req.body;
    const { access_token, shop_id } = dbTokens.shopee;

    if (!access_token || !shop_id) {
      return res.status(400).json({ success: false, error: 'Nenhuma loja Shopee conectada via OAuth.' });
    }

    const ts = Math.floor(Date.now() / 1000);

    // PASSO 1: Enviar a imagem para a CDN da Shopee para obter o image_id
    const FormDataLib = require('form-data');
    const form = new FormDataLib();
    form.append('image', fs.createReadStream(req.file.path));

    const pathImg = '/api/v2/product/upload_image';
    const signImg = crypto
      .createHmac('sha256', SHOPEE_PARTNER_KEY)
      .update(`${SHOPEE_PARTNER_ID}${pathImg}${ts}${access_token}${shop_id}`)
      .digest('hex');

    const imgRes = await axios.post(`${SHOPEE_HOST}${pathImg}?partner_id=${SHOPEE_PARTNER_ID}&timestamp=${ts}&access_token=${access_token}&shop_id=${shop_id}&sign=${signImg}`, form, {
      headers: form.getHeaders()
    });

    // Limpar arquivo temporário local
    fs.unlinkSync(req.file.path);

    const imageId = imgRes.data.response.image_info.image_id_list[0];

    // PASSO 2: Chamar o endpoint de criação de produto (add_item)
    const pathItem = '/api/v2/product/add_item';
    const signItem = crypto
      .createHmac('sha256', SHOPEE_PARTNER_KEY)
      .update(`${SHOPEE_PARTNER_ID}${pathItem}${ts}${access_token}${shop_id}`)
      .digest('hex');

    const itemRes = await axios.post(`${SHOPEE_HOST}${pathItem}?partner_id=${SHOPEE_PARTNER_ID}&timestamp=${ts}&access_token=${access_token}&shop_id=${shop_id}&sign=${signItem}`, {
      original_price: parseFloat(price),
      description: description,
      item_name: title,
      normal_stock: 10,
      category_id: 100015,
      images: { image_id_list: [imageId] },
      weight: 0.5,
      dimension: { package_length: 20, package_width: 15, package_height: 10 },
      logistic_info: [{ logistic_id: 80001, enabled: true }]
    });

    res.json({ success: true, itemRes: itemRes.data });
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ success: false, error: err.response?.data || err.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Servidor a rodar na porta ${PORT}`);
});
