const express = require('express');
const multer = require('multer');
const axios = require('axios');
const FormData = require('form-data');
require('dotenv').config();

const app = express();
const upload = multer({ storage: multer.memoryStorage() });

app.use(express.json());

app.get('/', (req, res) => {
  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>EDUSHOPING - Publicador Multi-Plataformas</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; }
    body { background-color: #0b0f19; color: #fff; min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 20px; }
    .container { width: 100%; max-width: 600px; display: flex; flex-direction: column; gap: 20px; }
    .card { background: #131b2e; padding: 25px; border-radius: 12px; border: 1px solid #1e293b; box-shadow: 0 8px 25px rgba(0,0,0,0.5); }
    h3 { color: #f8fafc; margin-bottom: 15px; font-size: 16px; }
    .form-group { margin-bottom: 15px; }
    label { display: block; font-size: 13px; color: #94a3b8; margin-bottom: 5px; }
    input[type="text"], textarea { width: 100%; padding: 12px; background: #0f172a; border: 1px solid #334155; color: #fff; border-radius: 6px; font-size: 14px; outline: none; }
    input[type="file"] { color: #94a3b8; font-size: 13px; }
    textarea { height: 100px; resize: none; }
    button { padding: 12px 20px; font-size: 14px; font-weight: bold; color: white; border: none; border-radius: 6px; cursor: pointer; transition: opacity 0.2s; }
    button:hover { opacity: 0.9; }
    .btn-shopee { background: #ee4d2d; width: 100%; }
    .btn-publish { background: #16a34a; width: 100%; }
    .file-status { font-size: 11px; color: #38bdf8; margin-top: 4px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="card">
      <h3>1. Autenticação Oficial da Loja</h3>
      <button class="btn-shopee" onclick="location.href='/auth/shopee'">Conectar Loja Shopee (OAuth)</button>
    </div>

    <div class="card">
      <h3>2. Publicar Produto na Central do Vendedor</h3>
      
      <div class="form-group">
        <label>Fotos do Produto (Mínimo 4 imagens)</label>
        <input type="file" id="fotos" accept="image/*" multiple onchange="atualizarStatusFotos()">
        <div class="file-status" id="statusFotos">Nenhuma imagem selecionada (Mín. 4)</div>
      </div>

      <div class="form-group">
        <label>Vídeo do Produto (Mínimo 1 vídeo)</label>
        <input type="file" id="video" accept="video/*" onchange="atualizarStatusVideo()">
        <div class="file-status" id="statusVideo">Nenhum vídeo selecionado (Mín. 1)</div>
      </div>

      <div class="form-group">
        <label>Título do Produto (SEO)</label>
        <input type="text" id="titulo" placeholder="Ex: Par de Palmilha Ortopédica em Gel">
      </div>

      <div class="form-group">
        <label>Descrição Comercial</label>
        <textarea id="descricao" placeholder="Detalhes completos do produto..."></textarea>
      </div>

      <button class="btn-publish" onclick="publicarProduto()">⚡ Publicar Direto na Shopee</button>
    </div>
  </div>

  <script>
    function atualizarStatusFotos() {
      const input = document.getElementById('fotos');
      const status = document.getElementById('statusFotos');
      const qtd = input.files.length;
      if (qtd > 0) {
        status.innerText = qtd + " imagem(ns) selecionada(s) " + (qtd < 4 ? "(Faltam " + (4 - qtd) + ")" : "✅");
        status.style.color = qtd < 4 ? "#f87171" : "#38bdf8";
      } else {
        status.innerText = "Nenhuma imagem selecionada (Mín. 4)";
        status.style.color = "#38bdf8";
      }
    }

    function atualizarStatusVideo() {
      const input = document.getElementById('video');
      const status = document.getElementById('statusVideo');
      if (input.files.length > 0) {
        status.innerText = "Vídeo selecionado: " + input.files[0].name + " ✅";
        status.style.color = "#38bdf8";
      } else {
        status.innerText = "Nenhum vídeo selecionado (Mín. 1)";
        status.style.color = "#38bdf8";
      }
    }

    async function publicarProduto() {
      const fotosInput = document.getElementById('fotos');
      const videoInput = document.getElementById('video');
      const titulo = document.getElementById('titulo').value;
      const descricao = document.getElementById('descricao').value;

      if (!fotosInput.files || fotosInput.files.length < 4) {
        alert('❌ Erro: É obrigatório enviar no mínimo 4 imagens do produto.');
        return;
      }

      if (!videoInput.files || videoInput.files.length < 1) {
        alert('❌ Erro: É obrigatório enviar no mínimo 1 vídeo do produto.');
        return;
      }

      if (!titulo || !descricao) {
        alert('Por favor, preencha o título e a descrição comercial.');
        return;
      }

      const formData = new FormData();
      for (let i = 0; i < fotosInput.files.length; i++) {
        formData.append('images', fotosInput.files[i]);
      }
      formData.append('video', videoInput.files[0]);
      formData.append('title', titulo);
      formData.append('description', descricao);
      formData.append('price', "49.90");

      try {
        const res = await fetch('/api/publish', {
          method: 'POST',
          body: formData
        });
        const data = await res.json();
        
        if (res.ok && data.success) {
          alert('Sucesso! O produto com as mídias exigidas foi publicado diretamente na Central da Shopee via API!');
        } else {
          alert('Erro ao publicar: ' + (data.error || JSON.stringify(data)));
        }
      } catch (err) {
        alert('Erro de comunicação com o servidor.');
      }
    }
  </script>
</body>
</html>`);
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
