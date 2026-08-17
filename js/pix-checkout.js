// js/pix-checkout.js
// Abre um modal de pagamento PIX ao clicar em qualquer botão de plano.
// Só pede o e-mail do lead — nome, CPF e telefone são gerados automaticamente
// (a TriboPay exige esses campos, mas não precisamos coletá-los do cliente).

async function gerarCheckoutTriboPay(event) {
  event.preventDefault();
  const el = event.currentTarget;
  const amount = parseInt(el.dataset.amount, 10);
  const offerHash = el.dataset.offerHash;
  const productHash = el.dataset.productHash;
  const title = el.dataset.title || 'Assinatura';

  if (!amount || !offerHash || offerHash.startsWith('COLOQUE_AQUI')) {
    alert('Este plano ainda não foi configurado (falta o offer_hash da TriboPay).');
    return;
  }

  abrirModalPix({ amount, offerHash, productHash, title });
}

let intervaloPixStatus = null;

// Ícone de verificado — mesmo ícone Font Awesome já usado (e funcionando) no resto da página
const PIX_SVG_VERIFICADO = `<i class="fas fa-check-circle" style="color:#ff6b3d;"></i>`;

// ---------- Captura dos parâmetros UTM da URL (pra atribuição de campanha) ----------

function pegarParametrosUtm() {
  const params = new URLSearchParams(window.location.search);
  return {
    utm_source: params.get('utm_source') || undefined,
    utm_campaign: params.get('utm_campaign') || undefined,
    utm_medium: params.get('utm_medium') || undefined,
    utm_content: params.get('utm_content') || undefined,
    utm_term: params.get('utm_term') || undefined,
    src: params.get('src') || undefined,
  };
}

// ---------- Geradores de dados auxiliares (nome, CPF, telefone) ----------

function gerarNomeAleatorio() {
  const primeiros = ['Ana', 'Bruno', 'Carla', 'Diego', 'Elisa', 'Fabio', 'Gabriela', 'Hugo', 'Isabela', 'Joao', 'Karina', 'Lucas', 'Marina', 'Nicolas', 'Otavio', 'Patricia', 'Rafael', 'Sofia', 'Tiago', 'Vitoria'];
  const ultimos = ['Silva', 'Souza', 'Oliveira', 'Santos', 'Pereira', 'Costa', 'Rodrigues', 'Almeida', 'Nascimento', 'Lima'];
  const p = primeiros[Math.floor(Math.random() * primeiros.length)];
  const u = ultimos[Math.floor(Math.random() * ultimos.length)];
  return `${p} ${u}`;
}

function gerarCpfValido() {
  const nums = Array.from({ length: 9 }, () => Math.floor(Math.random() * 10));
  const calcDigito = (arr, pesoInicial) => {
    let soma = 0;
    for (let i = 0; i < arr.length; i++) soma += arr[i] * (pesoInicial - i);
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };
  const d1 = calcDigito(nums, 10);
  const d2 = calcDigito([...nums, d1], 11);
  return [...nums, d1, d2].join('');
}

function gerarTelefoneAleatorio() {
  const ddds = ['11', '21', '31', '41', '51', '61', '71', '81', '85', '91'];
  const ddd = ddds[Math.floor(Math.random() * ddds.length)];
  const numero = '9' + Array.from({ length: 8 }, () => Math.floor(Math.random() * 10)).join('');
  return ddd + numero;
}

// ---------- Modal ----------

function abrirModalPix({ amount, offerHash, productHash, title }) {
  fecharModalPix();

  const overlay = document.createElement('div');
  overlay.id = 'pix-modal-overlay';
  overlay.innerHTML = `
    <div class="pix-modal">
      <button type="button" class="pix-modal-fechar" aria-label="Fechar">×</button>

      <div class="pix-cover">
        <img src="images/bannerlara.png" alt="" />
      </div>

      <div class="pix-profile-row">
        <div class="pix-avatar">
          <img src="images/perfil1.png" alt="Lara Jucah" />
        </div>
        <div class="pix-profile-text">
          <div class="pix-profile-name">Lara Jucah ${PIX_SVG_VERIFICADO}</div>
          <div class="pix-profile-username">@larajucah</div>
        </div>
      </div>

      <div class="pix-modal-body">
        <ul class="pix-beneficios">
          <li><i class="fas fa-check"></i> Acesso a todos conteúdos exclusivos</li>
          <li><i class="fas fa-check"></i> Chat ao vivo com a Lara Jucah</li>
          <li><i class="fas fa-check"></i> E muito mais...</li>
        </ul>

        <div class="pix-plano">
          <span class="pix-plano-nome">${title}</span>
          <span class="pix-valor">R$ ${(amount / 100).toFixed(2).replace('.', ',')}</span>
        </div>

        <form id="pix-form">
          <input type="email" id="pix-email" placeholder="Seu melhor e-mail" required />
          <button type="submit">Gerar QR Code PIX</button>
        </form>

        <div class="pix-trust-row">
          <span><i class="fas fa-lock"></i> Pagamento 100% seguro</span>
          <span><i class="fas fa-bolt"></i> Acesso imediato</span>
        </div>

        <div id="pix-resultado"></div>
      </div>
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
          utm: pegarParametrosUtm(),
          customer: {
            name: gerarNomeAleatorio(),
            email: document.getElementById('pix-email').value,
            document: gerarCpfValido(),
            phone: gerarTelefoneAleatorio(),
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
  const copiaECola = dados.pix?.pix_qr_code || dados.pix?.qr_code || dados.pix_qr_code;
  const hash = dados.hash || dados.transaction_hash;

  // Esconde o formulário de e-mail e os badges de confiança (já cumpriram o papel deles)
  document.getElementById('pix-form').style.display = 'none';
  const trustRow = document.querySelector('.pix-trust-row');
  if (trustRow) trustRow.style.display = 'none';

  const resultado = document.getElementById('pix-resultado');

  if (!copiaECola) {
    resultado.innerHTML = `
      <p class="pix-aviso">Não identifiquei o código PIX nesta resposta. Copie o JSON abaixo e me envie:</p>
      <textarea readonly class="pix-debug">${JSON.stringify(dados, null, 2)}</textarea>
    `;
    return;
  }

  // Geramos a imagem do QR Code a partir do próprio código copia-e-cola —
  // assim não dependemos do campo (às vezes inconsistente) que a TriboPay manda.
  const qrImagemSrc = `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=${encodeURIComponent(copiaECola)}`;

  resultado.innerHTML = `
    <div class="pix-qr">
      <p class="pix-formas-label">Formas de pagamento</p>
      <img class="pix-qr-img" src="${qrImagemSrc}" alt="QR Code PIX" />
      <p class="pix-copia-label">Escaneie ou copie o código:</p>
      <div class="pix-copia-cola">
        <input type="text" readonly value="${copiaECola}" id="pix-codigo" />
        <button type="button" id="pix-copiar">Copiar</button>
      </div>
      <p id="pix-status" class="pix-aguardando">${hash ? '<span class="pix-dot"></span> Aguardando pagamento...' : ''}</p>
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
        if (s.status === 'paid') {
          clearInterval(intervaloPixStatus);
          const statusEl = document.getElementById('pix-status');
          if (statusEl) {
            statusEl.innerHTML = '✅ Pagamento confirmado!';
            statusEl.classList.remove('pix-aguardando');
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
