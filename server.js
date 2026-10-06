// Servidor do Pix Fácil (Railway).
// Serve o site e a rota /api/cotacao, que lê o real na Cambios Chaco
// e devolve a cotação JÁ COM A SUA MARGEM. O percentual nunca vai para o cliente.

const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3000;
const TAXA = Number(process.env.TAXA_PERCENT || 7) / 100;
const URL_CHACO = process.env.CHACO_URL || 'https://www.cambioschaco.com.py/pt-br/';
const CACHE_MS = 10 * 60 * 1000;      // busca na Chaco no máximo a cada 10 min
const VALIDADE_MS = 30 * 60 * 1000;   // se a Chaco falhar, usa a última cotação boa por até 30 min

// ---------------- leitura da Chaco ----------------
function numero(txt) { return Number(String(txt).replace(/\./g, '').replace(',', '.')); }

function lerCotacao(html) {
  const texto = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ');
  let compra = null, venda = null;
  // primeira linha "Real <compra> <venda>" na faixa de guaranis por real
  // (a arbitragem "Dólar x Real 4,95 5,15" fica fora da faixa e é ignorada)
  for (const m of texto.matchAll(/\bReal\b\s+([\d.,]+)\s+([\d.,]+)/g)) {
    const c = numero(m[1]), v = numero(m[2]);
    if (c >= 300 && c <= 5000 && v >= 300 && v <= 5000) { compra = c; venda = v; break; }
  }
  const d = texto.match(/Atualiza\S*\s*:?\s*(\d{2}\/\d{2}\/\d{4}\s+\d{2}:\d{2})/i);
  return { compra, venda, atualizado: d ? d[1] : null };
}

function conferir(c, anterior) {
  if (!c.compra || !c.venda) return 'cotação do real não encontrada';
  if (c.compra >= c.venda) return 'compra maior ou igual à venda';
  if ((c.venda - c.compra) / c.venda > 0.15) return 'diferença compra/venda grande demais';
  if (anterior && Math.abs(c.venda - anterior.venda) / anterior.venda > 0.10) return 'variação maior que 10% desde a última leitura';
  return null;
}

let ultima = null;        // { compra, venda, atualizado, lidoEm }
let buscando = null;

async function buscarChaco() {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const r = await fetch(URL_CHACO, { signal: ctrl.signal, headers: { 'User-Agent': 'Mozilla/5.0 (compatible; pixfacil/1.0)' } });
    if (!r.ok) throw new Error('Chaco respondeu ' + r.status);
    const c = lerCotacao(await r.text());
    const erro = conferir(c, ultima);
    if (erro) throw new Error(erro);
    ultima = { ...c, lidoEm: Date.now() };
    console.log('[cotacao] ok', c.compra, c.venda, c.atualizado);
  } finally { clearTimeout(timer); }
}

async function obterCotacao() {
  const idade = ultima ? Date.now() - ultima.lidoEm : Infinity;
  if (idade > CACHE_MS) {
    if (!buscando) buscando = buscarChaco().catch(e => console.error('[cotacao] falhou:', e.message)).finally(() => { buscando = null; });
    if (!ultima || idade > VALIDADE_MS) await buscando;
  }
  if (!ultima || Date.now() - ultima.lidoEm > VALIDADE_MS) return null;
  return ultima;
}

// ---------------- servidor ----------------
const SEGURANCA = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
  'Content-Security-Policy': "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'"
};

const INDEX = path.join(__dirname, 'public', 'index.html');
const ARQUIVOS_JS = { '/config.js': 'config.js', '/qrcode.js': 'qrcode.js' };

function enviar(res, status, tipo, corpo, extra = {}) {
  res.writeHead(status, { ...SEGURANCA, 'Content-Type': tipo, ...extra });
  res.end(corpo);
}

http.createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  if (req.method !== 'GET' && req.method !== 'HEAD') return enviar(res, 405, 'text/plain; charset=utf-8', 'Método não permitido');

  if (url.pathname === '/api/cotacao') {
    const c = await obterCotacao();
    if (!c) return enviar(res, 503, 'application/json; charset=utf-8', JSON.stringify({ ok: false }), { 'Cache-Control': 'no-store' });
    return enviar(res, 200, 'application/json; charset=utf-8', JSON.stringify({
      ok: true,
      venda: c.venda * (1 + TAXA),    // ₲ por R$ quando o cliente COMPRA reais
      compra: c.compra * (1 - TAXA),  // ₲ por R$ quando o cliente VENDE reais
      atualizado: c.atualizado
    }), { 'Cache-Control': 'no-store' });
  }

  if (url.pathname === '/saude') return enviar(res, 200, 'text/plain; charset=utf-8', 'ok');

  if (ARQUIVOS_JS[url.pathname]) {
    return fs.readFile(path.join(__dirname, 'public', ARQUIVOS_JS[url.pathname]), (err, data) => err
      ? enviar(res, 404, 'text/plain; charset=utf-8', 'Não encontrado')
      : enviar(res, 200, 'application/javascript; charset=utf-8', data, { 'Cache-Control': 'no-cache' }));
  }

  if (url.pathname === '/' || url.pathname === '/index.html') {
    return fs.readFile(INDEX, (err, data) => err
      ? enviar(res, 500, 'text/plain; charset=utf-8', 'Erro ao carregar o site')
      : enviar(res, 200, 'text/html; charset=utf-8', data, { 'Cache-Control': 'no-cache' }));
  }

  enviar(res, 404, 'text/plain; charset=utf-8', 'Página não encontrada');
}).listen(PORT, () => {
  console.log('Pix Fácil rodando na porta ' + PORT);
  buscarChaco().catch(e => console.error('[cotacao] primeira leitura falhou:', e.message));
});
