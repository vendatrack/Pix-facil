// =========================================================
// DADOS DO SEU NEGÓCIO — edite só o que está entre aspas.
// (no GitHub: abra este arquivo, clique no lápis, altere e
//  clique em "Commit changes"; o Railway atualiza sozinho)
// =========================================================
var CONFIG = {
  nome: "Pix Fácil",
  whatsapp: "5545999999999",            // 55 + DDD + número, só números

  // Conta no BRASIL — cliente paga em REAIS (gera QR Code PIX)
  br: {
    pix: "20705429000272",              // chave PIX (CNPJ só números)
    titular: "ZoomTech Representacoes LTDA",
    doc: "20.705.429/0002-72",
    banco: "",                          // opcional, só aparece na tela
    cidade: "FOZ DO IGUACU"             // cidade da empresa, sem acento (vai no QR)
  },

  // Conta no PARAGUAI — cliente paga em GUARANIS
  py: {
    banco: "Nome do banco",
    titular: "Seu nome",
    conta: "000000000",
    doc: ""                             // CI/RUC
  }
};
