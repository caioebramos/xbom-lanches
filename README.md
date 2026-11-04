# Xbom Lanches

> Status: **no ar, em fase de implantação**. Os pedidos ainda não são guardados de forma permanente nem avisam o restaurante automaticamente.

Site: https://xbom-lanches.vercel.app

## Problema

Uma lanchonete sem canal próprio de pedidos, dependendo de conversa manual para receber e organizar cada pedido.

## Solução

- Cardápio digital
- Pizza meio a meio
- Checkout com taxa de entrega por bairro
- Pagamento por Pix, cartão ou dinheiro
- Acompanhamento do pedido em tempo real
- Painel administrativo com login (produtos, entrega, configurações e relatórios)

## Tecnologias

Next.js, React, Tailwind CSS, SQLite, Vercel e Claude Code.

## Rodar localmente

    npm install
    cp .env.example .env.local   # preencha ADMIN_PASSWORD e SESSION_SECRET
    npm run dev                  # http://localhost:3000

Os dados da loja (telefone, Pix, endereço) são configurados pelo painel em `/admin`. O repositório traz apenas valores de exemplo.
