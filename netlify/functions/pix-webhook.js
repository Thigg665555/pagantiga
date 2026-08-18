// netlify/functions/pix-webhook.js
// Usa o fetch nativo do Node (disponível a partir do Node 18), sem dependências externas.

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Método não permitido' };
  }

  try {
    const dados = JSON.parse(event.body || '{}');
    console.log('Webhook TriboPay recebido:', JSON.stringify(dados));

    // A TriboPay geralmente envia o status em um campo específico. 
    // Verifique no log do seu Netlify se o status é 'paid' ou 'approved'.
    const statusAprovado = dados.status === 'paid' || dados.status === 'approved';

    if (statusAprovado) {
      // Aqui estamos extraindo as UTMs que a TriboPay nos devolve no Webhook
      // e enviando para a UTMify registrar a conversão na campanha certa.
      const payloadUtmify = {
        orderId: dados.transaction_hash || dados.id,
        status: 'paid',
        amount: dados.amount,
        utm_source: dados.utm_source || '',
        utm_medium: dados.utm_medium || '',
        utm_campaign: dados.utm_campaign || '',
        utm_content: dados.utm_content || '',
        utm_term: dados.utm_term || '',
        src: dados.src || ''
      };

      const respostaUtmify = await fetch('https://api.utmify.com.br/api/v1/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-token': process.env.UTMFY_API_TOKEN // Não esqueça de adicionar esta variável na Netlify
        },
        body: JSON.stringify(payloadUtmify)
      });

      const resultado = await respostaUtmify.json();
      console.log('Envio para UTMify concluído:', resultado);
    }

    return { statusCode: 200, body: 'ok' };
  } catch (error) {
    console.error('Erro no processamento do Webhook:', error);
    return { statusCode: 500, body: 'Erro interno' };
  }
};
