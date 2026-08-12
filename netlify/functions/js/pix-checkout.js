// js/pix-checkout.js
// Abre um modal de pagamento PIX ao clicar em qualquer botão de plano.
// Cada botão precisa ter: data-amount (centavos), data-offer-hash,
// data-product-hash e data-title — já adicionados nos 6 botões da página.

async function gerarCheckoutTriboPay(event) {
  event.preventDefault();
  const el = event.currentTarget;
  const amount = parseInt(el.dataset.amount, 10);
  const offerHash = el.dataset.offerHash;
  const productHash = el.dataset.productHash;
  const title = el.dataset.title || 'Assinatura';

  if (!amount || !offerHash || offerHash.startsWith('COLOQUE_AQUI')) {
    alert('Este plano ainda não foi configurado (falta o offer_hash da TriboPay). Preencha o data-offer-hash desse botão no HTML.');
    return;
  }

  abrirModalPix({ amount, offerHash, productHash, title });
}

let intervaloPixStatus = null;

function abrirModalPix({ amount, offerHash, productHash, title }) {
  fecharModalPix();

  const overlay = document.createElement('div');
  overlay.id = 'pix-modal-overlay';
  overlay.innerHTML = `
    <div class="pix-modal">
      <button type="button" class="pix-modal-fechar" aria-label="Fechar">×</button>
      <h3>${title}</h3>
      <p class="pix-valor">R$ ${(amount / 100).toFixed(2).replace('.', ',')}</p>
      <form id="pix-form">
        <input type="text" id="pix-nome" placeholder="Nome completo" required />
        <input type="email" id="pix-email" placeholder="E-mail" required />
        <input type="text" id="pix-cpf" placeholder="CPF (só números)" required maxlength="14" />
        <input type="tel" id="pix-telefone" placeholder="Telefone (opcional)" />
        <button type="submit">Gerar QR Code PIX</button>
      </form>
      <div id="pix-resultado"></div>
    </div>
  `;
  document.body.appendChild(overlay);
  document.body.style.overflow = 'hidden';

  overlay.querySelector('.pix-modal-fechar').addEventListener('click', fecharModalPix);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) fecharModalPix();
  });

  document.getElementById('pix-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const botao = e.target.querySelector('button');
    botao.disabled = true;
    botao.textContent = 'Gerando PIX...';

    try {
      const resposta = await fetch('/.netlify/functions/create-pix', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount,
          offerHash,
          productHash,
          title,
          customer: {
            name: document.getElementById('pix-nome').value,
            email: document.getElementById('pix-email').value,
            document: document.getElementById('pix-cpf').value.replace(/\D/g, ''),
            phone: document.getElementById('pix-telefone').value.replace(/\D/g, ''),
          },
        }),
      });

      const dados = await resposta.json();
      if (!resposta.ok) throw new Error(dados.error || dados.message || 'Erro ao gerar PIX');

      mostrarQrCode(dados);
    } catch (erro) {
      document.getElementById('pix-resultado').innerHTML = `<p class="pix-erro">${erro.message}</p>`;
      botao.disabled = false;
      botao.textContent = 'Gerar QR Code PIX';
    }
  });
}

function mostrarQrCode(dados) {
  // ⚠️ Ainda não temos a confirmação oficial dos nomes de campo da resposta
  // da TriboPay para o QR Code. Tentamos os formatos mais comuns abaixo —
  // se nenhum bater, mostramos o JSON cru para você me enviar e eu ajustar.
  const qrImagem = dados.pix?.qr_code_base64 || dados.qr_code_base64 || dados.pix_qrcode_base64;
  const copiaECola = dados.pix?.qr_code || dados.pix_qr_code || dados.qr_code || dados.pix_copia_cola;
  const hash = dados.hash || dados.transaction_hash;

  const resultado = document.getElementById('pix-resultado');

  if (!copiaECola) {
    resultado.innerHTML = `
      <p class="pix-aviso">Não identifiquei automaticamente o campo do QR Code nesta resposta.
      Copie o JSON abaixo e me envie para eu ajustar o código:</p>
      <textarea readonly class="pix-debug">${JSON.stringify(dados, null, 2)}</textarea>
    `;
    return;
  }

  resultado.innerHTML = `
    <div class="pix-qr">
      ${qrImagem ? `<img src="data:image/png;base64,${qrImagem}" alt="QR Code PIX" />` : ''}
      <p>Escaneie o QR Code ou copie o código:</p>
      <div class="pix-copia-cola">
        <input type="text" readonly value="${copiaECola}" id="pix-codigo" />
        <button type="button" id="pix-copiar">Copiar</button>
      </div>
      <p id="pix-status">${hash ? 'Aguardando pagamento...' : ''}</p>
    </div>
  `;

  document.getElementById('pix-copiar').addEventListener('click', () => {
    const campo = document.getElementById('pix-codigo');
    campo.select();
    navigator.clipboard.writeText(campo.value);
    document.getElementById('pix-copiar').textContent = 'Copiado!';
  });

  if (hash) {
    intervaloPixStatus = setInterval(async () => {
      try {
        const r = await fetch(`/.netlify/functions/pix-status?hash=${hash}`);
        const s = await r.json();
        if (s.status === 'paid' || s.status === 'approved') {
          clearInterval(intervaloPixStatus);
          const statusEl = document.getElementById('pix-status');
          if (statusEl) {
            statusEl.textContent = '✅ Pagamento confirmado!';
            statusEl.classList.add('pix-pago');
          }
        }
      } catch (e) {
        console.error('Erro ao consultar status', e);
      }
    }, 5000);
  }
}

function fecharModalPix() {
  const existente = document.getElementById('pix-modal-overlay');
  if (existente) existente.remove();
  if (intervaloPixStatus) clearInterval(intervaloPixStatus);
  document.body.style.overflow = '';
}
