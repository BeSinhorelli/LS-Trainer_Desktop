const $abas = document.getElementById('abas');
const $btnNovaAba = document.getElementById('btnNovaAba');
const $btnVoltar = document.getElementById('btnVoltar');
const $btnAvancar = document.getElementById('btnAvancar');
const $btnRecarregar = document.getElementById('btnRecarregar');
const $btnHome = document.getElementById('btnHome');
const $btnDevtools = document.getElementById('btnDevtools');
const $endereco = document.getElementById('endereco');

const estadoAbas = new Map();
let abaAtivaId = null;

function renderizarAba({ id, titulo, url, carregando }) {
  let ref = estadoAbas.get(id);

  if (!ref) {
    const el = document.createElement('div');
    el.className = 'aba';
    el.dataset.id = id;

    const favicon = document.createElement('img');
    favicon.className = 'favicon';
    favicon.alt = '';
    favicon.style.display = 'none';

    const spinner = document.createElement('div');
    spinner.className = 'spinner';
    spinner.style.display = 'none';

    const tituloEl = document.createElement('span');
    tituloEl.className = 'titulo';
    tituloEl.textContent = titulo || 'LS Trainer';

    const fecharEl = document.createElement('button');
    fecharEl.className = 'fechar';
    fecharEl.textContent = '×';
    fecharEl.title = 'Fechar aba';

    el.append(favicon, spinner, tituloEl, fecharEl);
    $abas.appendChild(el);

    el.addEventListener('click', (e) => {
      if (e.target === fecharEl) return;
      window.navegador.ativarAba(id);
    });

    fecharEl.addEventListener('click', (e) => {
      e.stopPropagation();
      window.navegador.fecharAba(id);
    });

    ref = { elemento: el, faviconEl: favicon, spinnerEl: spinner, tituloEl, fecharEl };
    estadoAbas.set(id, ref);
  }

  ref.tituloEl.textContent = titulo || 'LS Trainer';
  ref.tituloEl.title = titulo || '';
  ref.elemento.title = url || '';

  if (carregando) {
    ref.spinnerEl.style.display = 'block';
    ref.faviconEl.style.display = 'none';
  } else {
    ref.spinnerEl.style.display = 'none';
    if (ref.faviconEl.src) ref.faviconEl.style.display = 'block';
  }

  if (id === abaAtivaId && document.activeElement !== $endereco) {
    $endereco.value = url || '';
  }
}

function marcarAbaAtiva(id) {
  abaAtivaId = id;
  for (const [abaId, ref] of estadoAbas) {
    ref.elemento.classList.toggle('ativa', abaId === id);
  }
}

$endereco.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    window.navegador.navegar($endereco.value);
    $endereco.blur();
  } else if (e.key === 'Escape') {
    $endereco.value = '';
    $endereco.blur();
  }
});

$endereco.addEventListener('focus', () => $endereco.select());

$btnVoltar.addEventListener('click', () => window.navegador.voltar());
$btnAvancar.addEventListener('click', () => window.navegador.avancar());
$btnRecarregar.addEventListener('click', () => window.navegador.recarregar());
$btnHome.addEventListener('click', () => window.navegador.home());
$btnDevtools.addEventListener('click', () => window.navegador.devtools());
$btnNovaAba.addEventListener('click', () => window.navegador.novaAba());

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.key === 't') {
    e.preventDefault();
    window.navegador.novaAba();
  }
  else if (e.ctrlKey && e.key === 'w') {
    e.preventDefault();
    if (abaAtivaId) window.navegador.fecharAba(abaAtivaId);
  }
  else if (e.ctrlKey && e.key === 'l') {
    e.preventDefault();
    $endereco.focus();
  }
  else if (e.ctrlKey && e.key === 'r') {
    e.preventDefault();
    window.navegador.recarregar();
  }
  else if (e.key === 'F5') {
    e.preventDefault();
    window.navegador.recarregar();
  }
  else if (e.altKey && e.key === 'ArrowLeft') {
    e.preventDefault();
    window.navegador.voltar();
  }
  else if (e.altKey && e.key === 'ArrowRight') {
    e.preventDefault();
    window.navegador.avancar();
  }
});

window.navegador.onAbaCriada((dados) => renderizarAba(dados));
window.navegador.onAbaAtualizada((dados) => renderizarAba(dados));
window.navegador.onAbaAtiva(({ id }) => marcarAbaAtiva(id));

window.navegador.onAbaFechada(({ id }) => {
  const ref = estadoAbas.get(id);
  if (ref) ref.elemento.remove();
  estadoAbas.delete(id);
});

window.navegador.onAbaFavicon(({ id, favicon }) => {
  const ref = estadoAbas.get(id);
  if (!ref) return;
  ref.faviconEl.src = favicon;
  ref.faviconEl.onload = () => { ref.faviconEl.style.display = 'block'; };
  ref.faviconEl.onerror = () => { ref.faviconEl.style.display = 'none'; };
});