/* The reading surface contains only immutable screenshots of the user's PDF. */
(() => {
  const base = new URL('../', document.currentScript.src);
  window.quranScanMarkup = function(key, label = 'Текст из Корана') {
    const scans = window.QURAN_SCANS[String(key)] || [];
    const widest = Math.max(1, ...scans.map(scan => scan.width));
    return `<div class="quran-scans">${scans.map(scan => {
      const src = new URL(scan.src, base).href;
      return `<figure class="quran-scan"><button type="button" class="scan-open" style="width:${100*scan.width/widest}%;margin-left:auto" data-scan="${src}" data-caption="${label} · страница ${scan.page}" aria-label="Увеличить: ${label}, страница ${scan.page}"><img src="${src}" width="${scan.width}" height="${scan.height}" alt="${label}. Снимок страницы ${scan.page} присланного PDF" loading="lazy" decoding="async"></button><figcaption>Страница ${scan.page} <span>Нажмите, чтобы увеличить</span></figcaption></figure>`;
    }).join('')}</div>`;
  };
  let dialog;
  document.addEventListener('click', event => {
    const button = event.target.closest('[data-scan]');
    if (!button) return;
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.className = 'scan-dialog';
      dialog.innerHTML = '<header><span></span><button type="button" aria-label="Закрыть снимок">Закрыть ×</button></header><div class="scan-viewport"><img alt=""></div>';
      document.body.append(dialog);
      dialog.querySelector('button').onclick = () => dialog.close();
      dialog.addEventListener('click', e => { if (e.target === dialog) dialog.close(); });
    }
    dialog.querySelector('span').textContent = button.dataset.caption;
    const img = dialog.querySelector('img');
    img.src = button.dataset.scan;
    img.alt = button.dataset.caption;
    dialog.showModal();
    dialog.querySelector('.scan-viewport').scrollTo(0, 0);
  });
})();
