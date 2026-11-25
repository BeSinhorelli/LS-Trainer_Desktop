const $btnDevtools = document.getElementById('btnDevtools');

$btnDevtools.addEventListener('click', () => {
  window.navegador.devtools();
});

// Atalho de teclado (F12) para abrir o DevTools também
document.addEventListener('keydown', (e) => {
  if (e.key === 'F12' || (e.ctrlKey && e.shiftKey && e.key === 'I')) {
    e.preventDefault();
    window.navegador.devtools();
  }
});