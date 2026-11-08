const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

// Interface do EDUSHOPING com Gerador de Anúncio IA e Calculadora de Margem
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>EDUSHOPING - Publicador & Precificador Shopee</title>
      <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #0f172a; color: #f8fafc; display: flex; justify-content: center; padding: 40px 20px; }
        .card { background-color: #1e293b; border-radius: 12px; padding: 30px; width: 100%; max-width: 600px; box-shadow: 0 10px 25px rgba(0,0,0,0.5); }
        h1 { font-size: 1.5rem; margin-bottom: 20px; color: #ff5722; text-align: center; }
        .section { margin-bottom: 25px; background-color: #0f172a; padding: 20px; border-radius: 8px; border: 1px solid #334155; }
        label { display: block; margin-top: 12px; font-weight: 600; font-size: 0.85rem; color: #94a3b8; }
        input[type="text"], input[type="number"], textarea, input[type="file"] { width: 100%; padding: 10px; margin-top: 5px; background: #1e293b; border: 1px solid #475569; border-radius: 6px; color: #fff; box-sizing: border-box; }
        .row { display: flex; gap: 15px; }
        .col { flex: 1; }
        button { width: 100%; padding: 12px; margin-top: 15px; border: none; border-radius: 6px; font-weight: bold; cursor: pointer; transition: 0.2s; }
        .btn-oauth { background-color: #ff5722; color: white; }
        .btn-ai { background-color: #6366f1; color: white; }
        .btn-submit { background-color: #10b981; color: white; }
        button:hover { opacity: 0.9; transform: translateY(-1px); }
        .result-box { background: #334155; padding: 12px; border-radius: 6px; margin-top: 10px; text-align: center; font-size: 1.1rem; color: #38bdf8; font-weight: bold; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>EDUSHOPING SaaS - Shopee Manager</h1>

        <!-- 1. Autenticação -->
        <div class="section">
          <h3>1. Autenticação Oficial da Loja</h3>
          <button class="btn-oauth" onclick="location.href='/auth/shopee'">Conectar Loja Shopee (OAuth)</button>
        </div>

        <!-- 2. Cadastro & Precificação -->
        <div class="section">
          <h3>2. Gerar Anúncio & Precificação</h3>
          
          <label>Foto do Produto</label>
          <input type="file" id="foto" accept="image/*">

          <label>Nome Base / Palavra-Chave do Produto</label>
          <input type="text" id="nomeBase" placeholder="Ex: Par de Palmilha Ortopédica em Gel">

          <button class="btn-ai" onclick="gerarAnuncioIA()">✨ Gerar Anúncio Automático (IA)</button>

          <label>Título do Produto (SEO)</label>
          <input type="text" id="titulo" placeholder="Título gerado automaticamente pela IA...">

          <label>Descrição Comercial</label>
          <textarea id="descricao" rows="4" placeholder="Descrição comercial completa gerada pela IA..."></textarea>

          <div class="row">
            <div class="col">
              <label>Custo do Produto (R$)</label>
              <input type="number" id="custo" step="0.01" placeholder="0.00" oninput="calcularPreco()">
            </div>
            <div class="col">
              <label>Lucro Desejado (%)</label>
              <input type="number" id="lucro" value="30" step="1" oninput="calcularPreco()">
            </div>
          </div>

          <div class="result-box" id="precoFinalDisplay">
            Preço de Venda Recomendado: R$ 0,00
          </div>

          <button class="btn-submit" onclick="publicarProduto()">⚡ Publicar Direto na Shopee</button>
        </div>
      </div>

      <script>
        function calcularPreco() {
          const custo = parseFloat(document.getElementById('custo').value) || 0;
          const margemDesejada = (parseFloat(document.getElementById('lucro').value) || 0) / 100;
          
          if (custo <= 0) {
            document.getElementById('precoFinalDisplay').innerText = "Preço de Venda Recomendado: R$ 0,00";
            return;
          }

          // Comissão Shopee (20%) + Taxa Fixa por item (R$ 4,00)
          const comissaoShopee = 0.20;
          const taxaFixa = 4.00;

          // Fórmula: Preço = (Custo + TaxaFixa) / (1 - Comissão - Margem)
          let precoVenda = (custo + taxaFixa) / (1 - comissaoShopee - margemDesejada);
          
          if (precoVenda < 0 || isNaN(precoVenda)) precoVenda = 0;

          document.getElementById('precoFinalDisplay').innerText = "Preço de Venda Recomendado: R$ " + precoVenda.toFixed(2);
        }

        function gerarAnuncioIA() {
          const nome = document.getElementById('nomeBase').value;
          if (!nome) {
            alert('Por favor, digite o nome base do produto!');
            return;
          }

          // Simulação de geração via IA
          document.getElementById('titulo').value = nome + " Profissional Alta Qualidade - Pronta Entrega";
          document.getElementById('descricao').value = "🔥 " + nome.toUpperCase() + " 🔥\n\n✅ Produto de alta durabilidade e conforto premium.\n✅ Ideal para uso diário com máxima resistência.\n✅ Envio imediato com garantia total de satisfação!";
        }

        function publicarProduto() {
          alert('Envio iniciado para a Shopee!');
        }
      </script>
    </body>
    </html>
  `);
});

// OAuth Shopee
app.get('/auth/shopee', (req, res) => {
  const partnerId = process.env.SHOPEE_PARTNER_ID || '123456';
  const redirectUrl = encodeURIComponent('https://edushoping-backend-pro.onrender.com/callback');
  const authUrl = `https://partner.shopeesz.com/api/v2/shop/auth_partner?partner_id=${partnerId}&redirect=${redirectUrl}`;
  res.redirect(authUrl);
});

app.get('/callback', (req, res) => {
  res.send('Callback recebido da Shopee!');
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
