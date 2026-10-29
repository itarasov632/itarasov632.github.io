// Each line has its own recording; only one recording may play at a time.
(() => {
    const players = [...document.querySelectorAll('.card')].map(card => {
        const button = card.querySelector('.recite');
        const audio = card.querySelector('audio');
        if (!button || !audio) return null;
        return { button, audio, error: card.querySelector('.error'),
            title: button.dataset.title, request: 0, requested: false };
    }).filter(Boolean);

    function display(player, playing) {
        player.button.classList.toggle('playing', playing);
        player.button.setAttribute('aria-pressed', String(playing));
        player.button.setAttribute('aria-label', `Воспроизвести заново: ${player.title}`);
    }

    function stop(player, reset = false) {
        player.request++;
        player.requested = false;
        player.audio.pause();
        if (reset && player.audio.readyState > 0) player.audio.currentTime = 0;
        display(player, false);
    }

    for (const player of players) {
        const { button, audio, error } = player;
        button.addEventListener('click', async () => {
            error.classList.remove('show');
            players.filter(other => other !== player).forEach(other => stop(other, true));
            const request = ++player.request;
            player.requested = true;
            try {
                // Every tap restarts this recording, even when it is already playing.
                audio.pause();
                audio.currentTime = 0;
                if (audio.error) audio.load();
                if (audio.ended) audio.currentTime = 0;
                // Keep play() in the user gesture for Safari and iPhone.
                await audio.play();
            } catch (e) {
                if (request !== player.request || e.name === 'AbortError') return;
                stop(player);
                error.classList.add('show');
            }
        });
        audio.addEventListener('playing', () => {
            if (!player.requested) { audio.pause(); return; }
            display(player, true);
        });
        audio.addEventListener('pause', () => {
            // A queued pause from a quick switch must not cancel a new play request.
            if (audio.paused) { player.requested = false; display(player, false); }
        });
        audio.addEventListener('ended', () => { player.requested = false; display(player, false); });
        audio.addEventListener('error', () => {
            if (audio.error) { stop(player); error.classList.add('show'); }
        });
    }
})();
