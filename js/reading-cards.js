// The entire image is the playback target; crops are never interactive subparts.
function readingCardMarkup(key, label) {
    const card = window.READING_CARDS[key];
    if (!card) throw new Error(`Missing reading card: ${key}`);
    const safeLabel = label.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;');
    return `<img class="reading-image" src="../${card.src}" width="${card.width}" height="${card.height}" style="width:${card.width}px" alt="${safeLabel}" loading="lazy" draggable="false">`;
}
