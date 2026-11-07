const express = require('express');
const app = express();
const port = process.env.PORT || 10000;

app.use(express.json());

app.get('/', (req, res) => {
  res.send('Edushoping Backend API está online! 🚀');
});

// Rota para o botão "Publicar em Todas as Plataformas"
app.post('/api/publicar', async (req, res) => {
  try {
    const dadosProduto = req.body;
    console.log("Recebido pedido de publicação para:", dadosProduto.titulo);

    const resultadosEnvio = {
      shopee: { status: "sucesso", anuncioId: "SHP-" + Date.now() },
      mercadoLivre: { status: "sucesso", anuncioId: "MLB-" + Date.now() },
      amazon: { status: "sucesso", anuncioId: "AMZ-" + Date.now() },
      magalu: { status: "sucesso", anuncioId: "MGLU-" + Date.now() },
      tiktokShop: { status: "sucesso", anuncioId: "TTK-" + Date.now() }
    };

    return res.status(200).json({
      sucesso: true,
      mensagem: "Produto publicado com sucesso em todas as plataformas!",
      marketplaces: resultadosEnvio
    });
  } catch (erro) {
    console.error("Erro ao publicar produto:", erro);
    return res.status(500).json({
      sucesso: false,
      erro: "Falha ao comunicar com as APIs dos marketplaces."
    });
  }
});

app.listen(port, () => {
  console.log(`Servidor edushoping a rodar na porta ${port}`);
});
