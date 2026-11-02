(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const base = new URL('../media/al-fatiha/', location.href);
  let clips = [], selected = -1, video = null, lastButton = null;
  const duration = seconds => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`;
  const label = clip => clip.kind === 'full_recitation' ? 'Аяты 1–7' :
    `Аят ${clip.ayah_numbers.join(', ')}${clip.ayah_part === 'opening_part' ? ' · часть 1' : clip.ayah_part === 'closing_part' ? ' · часть 2' : ''}`;
  const asset = (name, clip) => new URL(`${name}?v=${clip.sha256.slice(0, 12)}`, base).href;
  function stop() {
    if (!video) return;
    const old = video;
    video = null;
    old.pause(); old.removeAttribute('src'); old.load(); old.remove();
  }
  function showList() {
    stop(); selected = -1;
    $('viewer').hidden = true; $('lessonList').hidden = false;
    if (lastButton) lastButton.focus();
  }
  function mountVideo(clip) {
    stop();
    const current = document.createElement('video');
    video = current;
    current.controls = true; current.playsInline = true; current.preload = 'none';
    current.width = clip.width; current.height = clip.height;
    current.poster = asset(clip.poster, clip);
    current.setAttribute('aria-label', clip.title);
    current.src = asset(clip.filename, clip);
    $('videoSlot').replaceChildren(current);
    $('playerStatus').textContent = 'Нажмите «Смотреть», чтобы загрузить видео.';
    $('togglePlay').textContent = '▶ Смотреть'; $('retry').hidden = true;
    const on = (event, action) => current.addEventListener(event, () => { if (video === current) action(); });
    on('loadstart', () => { if (!current.paused) $('playerStatus').textContent = 'Загрузка видео…'; });
    on('waiting', () => { $('playerStatus').textContent = 'Загрузка видео…'; });
    on('stalled', () => { $('playerStatus').textContent = 'Ожидаем данные. Проверьте подключение к интернету.'; });
    on('canplay', () => { $('playerStatus').textContent = 'Видео готово к просмотру.'; });
    on('playing', () => { $('playerStatus').textContent = 'Воспроизведение'; $('retry').hidden = true; });
    on('play', () => { $('togglePlay').textContent = '⏸ Пауза'; });
    on('pause', () => { $('togglePlay').textContent = '▶ Продолжить'; if (!current.error) $('playerStatus').textContent = 'Пауза'; });
    on('ended', () => { $('playerStatus').textContent = 'Фрагмент завершён. Повторите его или перейдите к следующему.'; $('togglePlay').textContent = '▶ Смотреть'; });
    on('error', () => { $('playerStatus').textContent = 'Не удалось загрузить видео. Проверьте интернет и попробуйте ещё раз.'; $('retry').hidden = false; $('togglePlay').textContent = '▶ Смотреть'; });
  }
  function select(index) {
    if (index < 0 || index >= clips.length) return;
    selected = index;
    const clip = clips[index];
    document.querySelectorAll('audio').forEach(audio => audio.pause());
    $('lessonList').hidden = true; $('viewer').hidden = false;
    $('clipTitle').textContent = clip.title;
    $('clipLabel').textContent = `${label(clip)} · ${duration(clip.duration_seconds)} · ${(clip.size_bytes / 1e6).toFixed(1)} МБ`;
    const full = clip.kind === 'full_recitation';
    $('shortText').hidden = full; $('fullText').hidden = !full; $('fullText').open = false;
    $(full ? 'fullArabic' : 'shortText').textContent = clip.text_arabic;
    $('previous').disabled = index === 0; $('next').disabled = index === clips.length - 1;
    mountVideo(clip);
    $('clipTitle').focus({ preventScroll: true }); window.scrollTo(0, 0);
  }
  function route() {
    const id = location.hash.slice(1);
    const index = clips.findIndex(clip => clip.id === id);
    if (index < 0) showList(); else select(index);
  }
  async function play() {
    const current = video;
    if (!current) return;
    try { await current.play(); }
    catch (error) {
      if (video !== current || error.name === 'AbortError') return;
      $('playerStatus').textContent = 'Не удалось начать воспроизведение. Нажмите кнопку на самом видео или повторите загрузку.';
      $('retry').hidden = false;
    }
  }
  function seek(delta) {
    if (video && Number.isFinite(video.duration)) video.currentTime = Math.max(0, Math.min(video.duration, video.currentTime + delta));
  }
  async function loadList() {
    $('reloadList').hidden = true; $('listStatus').textContent = 'Загрузка списка…';
    try {
      const response = await fetch(new URL('manifest.json?v=20261102-1', base));
      if (!response.ok) throw new Error('Manifest unavailable');
      const data = await response.json();
      clips = data.clips.filter(clip => clip.is_complete && clip.publish_by_default && ['explanation', 'full_recitation'].includes(clip.kind)).sort((a, b) => a.playback_order - b.playback_order);
      if (!clips.length) throw new Error('No clips');
      $('explanations').replaceChildren(); $('recitation').replaceChildren();
      clips.forEach(clip => {
        const button = document.createElement('button'); button.className = 'lesson';
        const meta = document.createElement('span'); meta.className = 'meta';
        const name = document.createElement('span'); name.textContent = label(clip);
        const time = document.createElement('span'); time.textContent = `${duration(clip.duration_seconds)} · ${(clip.size_bytes / 1e6).toFixed(1)} МБ`;
        meta.append(name, time);
        const title = document.createElement('span'); title.className = 'title'; title.textContent = `▶ ${clip.title}`;
        button.append(meta, title);
        if (clip.kind === 'explanation') {
          const text = document.createElement('span'); text.className = 'arabic'; text.lang = 'ar'; text.dir = 'rtl'; text.textContent = clip.text_arabic; button.append(text);
        }
        button.addEventListener('click', () => { lastButton = button; location.hash = clip.id; });
        $(clip.kind === 'explanation' ? 'explanations' : 'recitation').append(button);
      });
      $('recitationHeading').hidden = !clips.some(clip => clip.kind === 'full_recitation');
      $('listStatus').textContent = ''; route();
    } catch (_) {
      $('listStatus').textContent = 'Не удалось загрузить список. Проверьте подключение к интернету.';
      $('reloadList').hidden = false;
    }
  }
  $('reloadList').addEventListener('click', loadList);
  $('backToList').addEventListener('click', () => { location.hash = ''; });
  $('previous').addEventListener('click', () => { if (selected > 0) location.hash = clips[selected - 1].id; });
  $('next').addEventListener('click', () => { if (selected < clips.length - 1) location.hash = clips[selected + 1].id; });
  $('togglePlay').addEventListener('click', () => { if (video?.paused) play(); else video?.pause(); });
  $('repeat').addEventListener('click', () => { if (video) { video.currentTime = 0; play(); } });
  $('rewind').addEventListener('click', () => seek(-10));
  $('forward').addEventListener('click', () => seek(10));
  $('retry').addEventListener('click', () => { if (selected >= 0) { mountVideo(clips[selected]); play(); } });
  $('fullscreen').addEventListener('click', async () => {
    if (!video) return;
    try {
      if (video.webkitEnterFullscreen) video.webkitEnterFullscreen();
      else if (video.requestFullscreen) await video.requestFullscreen();
      else $('playerStatus').textContent = 'Для полного экрана используйте кнопку в видеоплеере.';
    } catch (_) { $('playerStatus').textContent = 'Начните воспроизведение и нажмите полный экран в видеоплеере.'; }
  });
  window.addEventListener('hashchange', route);
  window.addEventListener('pagehide', stop);
  window.addEventListener('pageshow', event => { if (event.persisted && clips.length) route(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) video?.pause(); });
  loadList();
})();
