# Pix Fácil — câmbio Real ⇄ Guarani (Railway)

## Arquivos
- `public/index.html` — o site. Edite o bloco `CONFIG` (nome, WhatsApp, contas).
- `server.js` — servidor: entrega o site e lê a cotação da Cambios Chaco.
- `package.json` — diz ao Railway como iniciar (`npm start`).

## Variáveis (Railway > serviço > Variables)
- `TAXA_PERCENT` = 7  (sua margem; sem ela usa 7%)

## Como funciona a cotação
- Lê o real na página da Chaco no máximo a cada 10 minutos.
- Se a Chaco falhar, usa a última cotação boa por até 30 minutos.
- Depois disso, ou se a cotação vier estranha (variação > 10%, compra maior
  que venda), o site trava e mostra o botão de WhatsApp.

## Testes
- `https://SEU-DOMINIO/api/cotacao` → deve mostrar `"ok":true`
- `https://SEU-DOMINIO/saude` → deve mostrar `ok`
- Logs: Railway > serviço > Deployments > View logs (procure `[cotacao]`).
