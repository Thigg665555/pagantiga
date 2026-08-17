// netlify/functions/create-pix.js
// Roda no servidor da Netlify (não no navegador) — por isso o token fica seguro.
// URL final: https://SEUSITE.netlify.app/.netlify/functions/create-pix

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: '' };
  }

  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Método não permitido. Utilize POST.' }),
    };
  }

  try {
    const apiToken = process.env.TRIBOPAY_API_TOKEN;
    if (!apiToken) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'TRIBOPAY_API_TOKEN não configurado nas variáveis de ambiente do Netlify.' }),
      };
    }

    const body = JSON.parse(event.body || '{}');
    const { amount, offerHash, productHash, title, customer, utm } = body;

    if (!offerHash || !amount || !customer?.name || !customer?.email || !customer?.document) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Dados obrigatórios faltando (offerHash, amount, customer.name/email/document).' }),
      };
    }

    // Formato confirmado a partir do exemplo oficial da TriboPay que você já tinha:
    // api_token vai na URL (query string), não no header Authorization.
    const payload = {
      amount,
      offer_hash: offerHash,
      payment_method: 'pix',
      // UTMs repassados para a TriboPay identificar qual campanha/criativo gerou a venda
      // (a integração TriboPay -> UTMify usa esses campos para atribuição).
      utm_source: utm?.utm_source,
      utm_campaign: utm?.utm_campaign,
      utm_medium: utm?.utm_medium,
      utm_content: utm?.utm_content,
      utm_term: utm?.utm_term,
      src: utm?.src,
      customer: {
        name: customer.name,
        email: customer.email,
        phone_number: customer.phone || '',
        document: customer.document,
      },
      cart: [
        {
          product_hash: productHash,
          title: title || 'Assinatura',
          price: amount,
          quantity: 1,
          operation_type: 1,
          tangible: false,
        },
      ],
    };

    const url = `https://api.tribopay.com.br/api/public/v1/transactions?api_token=${apiToken}`;
    const resposta = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload),
    });

    const dados = await resposta.json();

    // 👉 Veja esse log em Netlify > Functions > create-pix > Logs no primeiro
    // teste real, para confirmar os nomes dos campos do QR Code.
    console.log('Resposta da TriboPay:', JSON.stringify(dados));

    return {
      statusCode: resposta.status,
      headers,
      body: JSON.stringify(dados),
    };
  } catch (erro) {
    console.error('Erro na Netlify Function:', erro);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Erro interno no servidor: ' + erro.message }),
    };
  }
};
