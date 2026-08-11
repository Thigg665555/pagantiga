// netlify/functions/pix-webhook.js
// A TriboPay chama essa URL quando o status de um pagamento muda.
// Cadastre no painel: Integrações > Webhooks
// URL: https://SEUSITE.netlify.app/.netlify/functions/pix-webhook

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  const dados = JSON.parse(event.body || '{}');
  // Formato confirmado na documentação da TriboPay:
  // { transaction_hash, status, amount, payment_method, paid_at }
  console.log('Webhook TriboPay recebido:', JSON.stringify(dados));

  return { statusCode: 200, body: 'ok' };
};
