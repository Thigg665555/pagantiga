// netlify/functions/payment.js
const fetch = require('node-fetch');

exports.handler = async (event) => {
    const { action, amount, hash } = JSON.parse(event.body);
    const API_KEY = process.env.TRIBOPAY_API_KEY; // Configure esta variável no Dashboard do Netlify
    const PRODUCT_HASH = process.env.PRODUCT_HASH;
    const UPSELL_URL = process.env.UPSELL_URL;

    if (action === 'create_pix') {
        const response = await fetch('https://api.tribopay.com.br/api/public/v1', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-API-Key': API_KEY },
            body: JSON.stringify({
                amount: parseInt(amount),
                productHash: PRODUCT_HASH,
                offer_link: UPSELL_URL,
                customer: {
                    name: "Cliente Random",
                    email: `cliente_${Date.now()}@email.com`,
                    document: "12345678909", // Em produção, use um gerador de CPF aqui
                    phone: "11999999999"
                }
            })
        });
        return { statusCode: 200, body: JSON.stringify(await response.json()) };
    }

    if (action === 'check_status') {
        const response = await fetch(`https://api.tribopay.com.br/api/public/v1check_status.php?hash=${hash}`);
        const data = await response.json();
        return { 
            statusCode: 200, 
            body: JSON.stringify(data.paid ? { status: 'paid', redirect_url: UPSELL_URL } : { status: 'pending' }) 
        };
    }
};