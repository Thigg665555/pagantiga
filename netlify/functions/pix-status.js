// netlify/functions/pix-status.js
// Consulta o status atual de uma transação direto na TriboPay.
// URL: https://SEUSITE.netlify.app/.netlify/functions/pix-status?hash=XXXX

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Content-Type': 'application/json',
  };

  const hash = event.queryStringParameters?.hash;
  if (!hash) {
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Informe o hash da transação (?hash=...)' }) };
  }

  try {
    const apiToken = process.env.TRIBOPAY_API_TOKEN;
    // ⚠️ Endpoint de consulta seguindo o padrão REST — confirme no painel
    // TriboPay se o caminho é exatamente /transactions/{hash}.
    const url = `https://api.tribopay.com.br/api/public/v1/transactions/${hash}?api_token=${apiToken}`;
    const resposta = await fetch(url);
    const dados = await resposta.json();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ status: dados.status, raw: dados }),
    };
  } catch (erro) {
    console.error('Erro ao consultar status:', erro);
    return { statusCode: 500, headers, body: JSON.stringify({ error: 'Erro ao consultar status' }) };
  }
};
