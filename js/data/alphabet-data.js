// Данные арабского алфавита
export const arabicAlphabet = [
    {
        id: 1,
        letter: "ا",
        name: "Алиф",
        transcription: "ʾalif",
        description: "Первая буква арабского алфавита",
        forms: {
            initial: "ا",
            medial: "ـا",
            final: "ـا"
        },
        audioFile: "01.mp3",
        imageFile: "01.png"
    },
    {
        id: 2,
        letter: "ب",
        name: "Ба",
        transcription: "bāʾ",
        description: "Звонкий губно-губной взрывной",
        forms: {
            initial: "بـ",
            medial: "ـبـ",
            final: "ـب"
        },
        audioFile: "02.mp3",
        imageFile: "02.png"
    },
    // ... остальные 26 букв
    {
        id: 28,
        letter: "ي",
        name: "Йа",
        transcription: "yāʾ",
        description: "Палатальный аппроксимант",
        forms: {
            initial: "يـ",
            medial: "ـيـ",
            final: "ـي"
        },
        audioFile: "28.mp3",
        imageFile: "28.png"
    }
];

// Вспомогательные функции
export function getLetterById(id) {
    return arabicAlphabet.find(letter => letter.id === parseInt(id));
}

export function getNextLetterId(currentId) {
    const nextId = currentId + 1;
    return nextId <= 28 ? nextId : null;
}

export function getPrevLetterId(currentId) {
    const prevId = currentId - 1;
    return prevId >= 1 ? prevId : null;
}

export function getAllLetters() {
    return arabicAlphabet;
}
