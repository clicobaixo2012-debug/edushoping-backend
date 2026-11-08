const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html lang="pt-BR">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>EDUSHOPING - Publicador Multi-Plataformas</title>
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
        .image-preview-container { display: flex; gap: 10px; margin-top: 10px; flex-wrap: wrap; }
        .image-preview { width: 70px; height: 70px; object-fit: cover; border-radius: 6px; border: 1px dashed #6366f1; display: none; }
        .status-files { font-size: 0.8rem; color: #38bdf8; margin-top: 4px; }
        
        /* Estilos da Seleção de Plataformas */
        .platforms-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; margin-top: 8px; }
        .platform-item { background: #1e293b; border: 1px solid #475569; border-radius: 6px; padding: 10px; display: flex; align-items: center; gap: 10px; cursor: pointer; transition: 0.2s; }
        .platform-item:hover { border-color: #6366f1; }
        .platform-item input[type="checkbox"] { width: 18px; height: 18px; accent-color: #ff5722; cursor: pointer; }
        .platform-label { font-size: 0.9rem; font-weight: bold; color: #f8fafc; cursor: pointer; }
      </style>
    </head>
    <body>
      <div class="card">
        <h1>EDUSHOPING SaaS - Multi-Platform Manager</h1>

        <!-- 1. Autenticação -->
        <div class="section">
          <h3>1. Autenticação Oficial da Loja</h3>
          <button class="btn-oauth" onclick="location.href='/auth/shopee'">Conectar Loja Shopee (OAuth)</button>
        </div>

        <!-- 2. Cadastro & Precificação -->
        <div class="section">
          <h3>2. Gerar Anúncio & Precificação</h3>
          
          <label>Fotos do Produto (Mínimo 4 imagens)</label>
          <input type="file" id="fotos" accept="image/*" multiple onchange="mostrarPreviews(event)">
          <div class="status-files" id="statusFotos">Nenhuma imagem selecionada (Mín. 4)</div>
          <div class="image-preview-container" id="previewContainer"></div>

          <label>Vídeo do Produto (Mínimo 1 vídeo)</label>
          <input type="file" id="video" accept="video/*" onchange="mostrarStatusVideo(event)">
          <div class="status-files" id="statusVideo">Nenhum vídeo selecionado (Mín. 1)</div>

          <label>Nome Base / Palavra-Chave do Produto</label>
          <input type="text" id="nomeBase" placeholder="Ex: Par de Palmilha Ortopédica em Gel">

          <button class="btn-ai" type="button" onclick="gerarAnuncioIA()">✨ Gerar Anúncio Automático (IA)</button>

          <label>Título do Produto (SEO)</label>
          <input type="text" id="titulo" placeholder="Título gerado automaticamente pela IA...">

          <label>Descrição Comercial</label>
          <textarea id="descricao" rows="4" placeholder="Descrição comercial completa gerada pela IA..."></textarea>

          <!-- SELEÇÃO DE PLATAFORMAS -->
          <label>Selecione as Plataformas para Publicação</label>
          <div class="platforms-grid">
            <label class="platform-item">
              <input type="checkbox" value="Shopee" checked>
              <span class="platform-label">🟧 Shopee</span>
            </label>
            <label class="platform-item">
              <input type="checkbox" value="Amazon">
              <span class="platform-label">🟨 Amazon</span>
            </label>
            <label class="platform-item">
              <input type="checkbox" value="Mercado Livre">
              <span class="platform-label">🟨 Mercado Livre</span>
            </label>
            <label class="platform-item">
              <input type="checkbox" value="Magazine Luiza">
              <span class="platform-label">🟦 Magalu</span>
            </label>
            <label class="platform-item" style="grid-column: span 2;">
              <input type="checkbox" value="TikTok Shop">
              <span class="platform-label">⬛ TikTok Shop</span>
            </label>
          </div>

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

          <button class="btn-submit" type="button" onclick="publicarProduto()">⚡ Publicar nas Plataformas Selecionadas</button>
        </div>
      </div>

      <script>
        function mostrarPreviews(event) {
          const files = event.target.files;
          const container = document.getElementById('previewContainer');
          const status = document.getElementById('statusFotos');
          container.innerHTML = '';

          if (files.length > 0) {
            status.innerText = \`\${files.length} imagem(ns) selecionada(s)\${files.length < 4 ? ' (Atenção: o mínimo são 4)' : ' ✅'}\`;
            status.style.color = files.length < 4 ? '#f87171' : '#38bdf8';

            for (let i = 0; i < Math.min(files.length, 6); i++) {
              const img = document.createElement('img');
              img.src = URL.createObjectURL(files[i]);
              img.className = 'image-preview';
              img.style.display = 'block';
              container.appendChild(img);
            }

            const nomeInput = document.getElementById('nomeBase');
            if (!nomeInput.value) {
              const nomeFicheiro = files[0].name.replace(/\\.[^/.]+$/, "").replace(/[-_]/g, " ");
              nomeInput.value = nomeFicheiro;
            }
          } else {
            status.innerText = 'Nenhuma imagem selecionada (Mín. 4)';
            status.style.color = '#38bdf8';
          }
        }

        function mostrarStatusVideo(event) {
          const file = event.target.files[0];
          const status = document.getElementById('statusVideo');
          if (file) {
            status.innerText = \`Vídeo carregado: \${file.name} ✅\`;
            status.style.color = '#38bdf8';
          } else {
            status.innerText = 'Nenhum vídeo selecionado (Mín. 1)';
            status.style.color = '#38bdf8';
          }
        }

        function calcularPreco() {
          const custo = parseFloat(document.getElementById('custo').value) || 0;
          const margemDesejada = (parseFloat(document.getElementById('lucro').value) || 0) / 100;
          
          if (custo <= 0) {
            document.getElementById('precoFinalDisplay').innerText = "Preço de Venda Recomendado: R$ 0,00";
            return;
          }

          const comissaoPadrao = 0.20;
          const taxaFixa = 4.00;

          let precoVenda = (custo + taxaFixa) / (1 - comissaoPadrao - margemDesejada);
          
          if (precoVenda < 0 || isNaN(precoVenda)) precoVenda = 0;

          document.getElementById('precoFinalDisplay').innerText = "Preço de Venda Recomendado: R$ " + precoVenda.toFixed(2);
        }

        function gerarAnuncioIA() {
          let nome = document.getElementById('nomeBase').value;
          const fotosInput = document.getElementById('fotos');

          if (!nome && fotosInput.files.length > 0) {
            nome = fotosInput.files[0].name.replace(/\\.[^/.]+$/, "").replace(/[-_]/g, " ");
            document.getElementById('nomeBase').value = nome;
          }

          if (!nome) {
            alert('Por favor, selecione as fotos ou digite a palavra-chave do produto!');
            return;
          }

          const produtoFormatado = nome.charAt(0).toUpperCase() + nome.slice(1);
          
          document.getElementById('titulo').value = produtoFormatado + " Profissional Alta Qualidade - Pronta Entrega";
          document.getElementById('descricao').value = "🔥 " + produtoFormatado.toUpperCase() + " 🔥\\n\\n✅ Produto de alta durabilidade, resistência e conforto premium.\\n✅ Design ergonômico ideal para o uso diário.\\n✅ Envio imediato com garantia total de satisfação e nota fiscal!";
        }

        function publicarProduto() {
          const fotosInput = document.getElementById('fotos');
          const videoInput = document.getElementById('video');

          if (!fotosInput.files || fotosInput.files.length < 4) {
            alert('❌ Erro: É obrigatório enviar no mínimo 4 imagens do produto para publicar nas plataformas!');
            return;
          }

          if (!videoInput.files || videoInput.files.length < 1) {
            alert('❌ Erro: É obrigatório enviar no mínimo 1 vídeo do produto para publicar nas plataformas!');
            return;
          }

          const selecionadas = Array.from(document.querySelectorAll('.platforms-grid input[type="checkbox"]:checked'))
                                     .map(cb => cb.value);

          if (selecionadas.length === 0) {
            alert('Por favor, selecione pelo menos uma plataforma para publicar!');
            return;
          }

          alert('🚀 Iniciando publicação automática do anúncio (com ' + fotosInput.files.length + ' imagens e 1 vídeo) em: ' + selecionadas.join(', '));
        }
      </script>
    </body>
    </html>
  `);
});

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
```[cite: 14]

### O que mudou:
1. **Input de Fotos:** Agora aceita seleção múltipla (`multiple`) com contador em tempo real e pré-visualização das miniaturas[cite: 14].
2. **Input de Vídeo:** Adicionado campo específico para o upload do vídeo obrigatório do produto[cite: 14].
3. **Validação Rigorosa:** A função `publicarProduto()` valida obrigatoriamente se existem **pelo menos 4 imagens** e **1 vídeo** antes de avançar com o processo[cite: 14].
