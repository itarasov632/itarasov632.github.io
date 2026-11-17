(() => {
    const lessons = new Map([
        [1, {url: 'al-fatiha.html', summary: '8 объяснений и полное чтение'}],
        [112, {url: 'al-ikhlas.html', summary: '4 объяснения и полное чтение'}]
    ]);
    const plurals = new Intl.PluralRules('ru');
    const ayahForms = {one: 'аят', few: 'аята', many: 'аятов'};
    const videoList = document.getElementById('videoList');
    const readingList = document.getElementById('readingList') || document.getElementById('surahsList');

    for (const surah of surahsList) {
        const lesson = lessons.get(surah.id);
        const video = Boolean(lesson && (videoList || surah.id === 1));
        const card = document.createElement('a');
        card.className = 'library-card';
        card.href = video ? lesson.url : `surah.html?id=${surah.id}${videoList ? '&from=pronunciation' : ''}`;
        const count = `${surah.ayahCount} ${ayahForms[plurals.select(surah.ayahCount)]}`;
        let summary = `${count} · Текст и аудио`;
        if (video) summary = lesson.summary;
        else if (surah.id === 67) summary = `${count} · Аудио аятов 1–12`;
        else if ([96, 98].includes(surah.id)) summary = `${count} · Чтение`;

        const art = document.createElement('img');
        art.alt = '';
        art.src = `../assets/images/watercolor/books-${surah.id === 112 || (!video && surah.id % 2 === 0) ? 'clay' : 'sage'}.webp`;
        const copy = document.createElement('span');
        copy.className = 'card-copy';
        const number = document.createElement('small');
        number.className = 'book-number';
        number.textContent = `Сура ${surah.number}`;
        const title = document.createElement('strong');
        title.textContent = surah.name;
        const description = document.createElement('small');
        description.textContent = summary;
        copy.append(number, title, description);
        const arrow = document.createElement('span');
        arrow.setAttribute('aria-hidden', 'true');
        arrow.className = 'chevron';
        arrow.textContent = '›';
        card.append(art, copy, arrow);
        (videoList && video ? videoList : readingList).append(card);
    }
})();
