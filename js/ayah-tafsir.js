// Display the publisher's original, individual ayah page without copying its text.
(() => {
    const HOLD_MS = 550;
    const MOVE_PX = 10;
    let dialog;
    let opener;
    let cancelPending = () => {};

    function ensureDialog() {
        if (dialog) return;
        dialog = document.createElement('dialog');
        dialog.id = 'tafsirDialog';
        dialog.className = 'tafsir-dialog';
        dialog.setAttribute('aria-labelledby', 'tafsirTitle');
        dialog.innerHTML = `
            <div class="tafsir-header">
                <h2 id="tafsirTitle"></h2>
                <button type="button" id="closeTafsir" autofocus>Закрыть ×</button>
            </div>
            <p class="tafsir-loading" id="tafsirLoading" role="status">Загружается тафсир Azan.info…</p>
            <iframe id="tafsirFrame" referrerpolicy="strict-origin-when-cross-origin"
                sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox"></iframe>
            <div class="tafsir-footer">
                <a id="tafsirSource" target="_blank" rel="noopener noreferrer">Открыть этот аят на Azan.info ↗</a>
            </div>`;
        document.body.appendChild(dialog);
        document.getElementById('closeTafsir').addEventListener('click', () => dialog.close());
        // Only a click entirely outside the panel dismisses the backdrop.
        let backdropDown = false;
        const outside = event => {
            const rect = dialog.getBoundingClientRect();
            return event.clientX < rect.left || event.clientX > rect.right ||
                event.clientY < rect.top || event.clientY > rect.bottom;
        };
        dialog.addEventListener('pointerdown', event => { backdropDown = event.target === dialog && outside(event); });
        dialog.addEventListener('click', event => {
            if (backdropDown && event.target === dialog && outside(event)) dialog.close();
            backdropDown = false;
        });
        document.getElementById('tafsirFrame').addEventListener('load', () => {
            document.getElementById('tafsirLoading').hidden = true;
        });
        dialog.addEventListener('close', () => {
            document.getElementById('tafsirFrame').src = 'about:blank';
            if (opener?.isConnected) opener.focus({ preventScroll: true });
            opener = null;
        });
    }

    function open(button, ayah, pauseAudio) {
        cancelPending();
        ensureDialog();
        if (dialog.open) return;
        pauseAudio();
        opener = button;
        const url = `https://azan.info/tafsir/an-nas/${ayah}`;
        document.getElementById('tafsirTitle').textContent = `Ан-Нас · Аят ${ayah} · Тафсир`;
        const frame = document.getElementById('tafsirFrame');
        frame.title = `Тафсир суры Ан-Нас, аят ${ayah} — Azan.info`;
        document.getElementById('tafsirSource').href = url;
        document.getElementById('tafsirLoading').hidden = false;
        frame.src = url;
        dialog.showModal();
    }

    function bind(button, surah, ayah, pauseAudio) {
        if (surah !== 114 || ayah < 1 || ayah > 6) return;
        ensureDialog();
        button.classList.add('has-tafsir');
        button.setAttribute('aria-haspopup', 'dialog');
        button.setAttribute('aria-controls', 'tafsirDialog');
        button.setAttribute('aria-describedby', 'tafsirHint');
        button.setAttribute('aria-keyshortcuts', 'Shift+F10');
        let timer;
        let pointer;
        let suppressClick = false;
        let moved = false;
        const cancel = () => {
            clearTimeout(timer);
            timer = null;
            pointer = null;
        };
        button.addEventListener('pointerdown', event => {
            cancelPending();
            if (!event.isPrimary || event.button !== 0) return;
            suppressClick = false;
            moved = false;
            pointer = { id: event.pointerId, x: event.clientX, y: event.clientY };
            cancelPending = cancel;
            timer = setTimeout(() => {
                suppressClick = true;
                open(button, ayah, pauseAudio);
            }, HOLD_MS);
        });
        button.addEventListener('pointermove', event => {
            if (pointer?.id !== event.pointerId) return;
            if (Math.hypot(event.clientX - pointer.x, event.clientY - pointer.y) > MOVE_PX) {
                moved = true;
                suppressClick = true;
                cancel();
            }
        });
        for (const type of ['pointerup', 'pointercancel', 'pointerleave']) {
            button.addEventListener(type, cancel);
        }
        button.addEventListener('click', event => {
            if (!suppressClick) return;
            event.preventDefault();
            event.stopImmediatePropagation();
            suppressClick = false;
        }, true);
        button.addEventListener('contextmenu', event => {
            event.preventDefault();
            if (moved) return;
            suppressClick = true;
            open(button, ayah, pauseAudio);
        });
        button.addEventListener('keydown', event => {
            if (event.key === 'ContextMenu' || (event.shiftKey && event.key === 'F10')) {
                event.preventDefault();
                open(button, ayah, pauseAudio);
            } else if (event.key === 'Enter' || event.key === ' ') {
                suppressClick = false;
            }
        });
    }

    function close() {
        cancelPending();
        if (dialog?.open) dialog.close();
    }

    // Let the browser keep normal touch scrolling; cancel only the pending hold.
    document.addEventListener('scroll', () => cancelPending(), { capture: true, passive: true });
    document.addEventListener('pointerdown', event => { if (!event.isPrimary) cancelPending(); }, true);
    document.addEventListener('visibilitychange', () => cancelPending());
    window.addEventListener('blur', () => cancelPending());
    window.ayahTafsir = { bind, close };
})();
