"""Eastern Armenian → Latin and Cyrillic, for place names that have no English or Russian spelling.

Follows the spellings in common use (Stepanakert, Gyumri / Степанакерт, Гюмри): aspirates are
not marked, initial ե/ո become Ye/Vo, Russian renders հ and ղ as г and х. Review before release.
"""

LATIN = {
    "ա": "a", "բ": "b", "գ": "g", "դ": "d", "ե": "e", "զ": "z", "է": "e", "ը": "y", "թ": "t",
    "ժ": "zh", "ի": "i", "լ": "l", "խ": "kh", "ծ": "ts", "կ": "k", "հ": "h", "ձ": "dz", "ղ": "gh",
    "ճ": "ch", "մ": "m", "յ": "y", "ն": "n", "շ": "sh", "ո": "o", "չ": "ch", "պ": "p", "ջ": "j",
    "ռ": "r", "ս": "s", "վ": "v", "տ": "t", "ր": "r", "ց": "ts", "փ": "p", "ք": "k", "օ": "o",
    "ֆ": "f", "և": "ev",
}
CYRILLIC = {
    "ա": "а", "բ": "б", "գ": "г", "դ": "д", "ե": "е", "զ": "з", "է": "э", "ը": "ы", "թ": "т",
    "ժ": "ж", "ի": "и", "լ": "л", "խ": "х", "ծ": "ц", "կ": "к", "հ": "г", "ձ": "дз", "ղ": "х",
    "ճ": "ч", "մ": "м", "յ": "й", "ն": "н", "շ": "ш", "ո": "о", "չ": "ч", "պ": "п", "ջ": "дж",
    "ռ": "р", "ս": "с", "վ": "в", "տ": "т", "ր": "р", "ց": "ц", "փ": "п", "ք": "к", "օ": "о",
    "ֆ": "ф", "և": "ев",
}
VOWELS = set("աեէըիոօու")


def _convert(text: str, table: dict[str, str], cyrillic: bool) -> str:
    out = []
    lower = text.lower()
    i = 0
    while i < len(lower):
        ch, upper = lower[i], text[i] != lower[i]
        word_start = i == 0 or not lower[i - 1].isalpha()
        after_vowel = i > 0 and lower[i - 1] in VOWELS
        nxt = lower[i + 1] if i + 1 < len(lower) else ""
        step = 1
        if ch == "ո" and nxt == "ւ":
            piece, step = ("у" if cyrillic else "u"), 2
        elif cyrillic and ch == "յ" and lower[i + 1:i + 3] == "ու":
            piece, step = "ю", 3
        elif cyrillic and ch == "յ" and nxt == "ա":
            piece, step = "я", 2
        elif ch == "ե" and (word_start or after_vowel) and not cyrillic:
            piece = "ye"
        elif ch == "ո" and word_start:
            piece = "во" if cyrillic else "vo"
        elif ch == "և" and word_start:
            piece = "ев" if cyrillic else "yev"
        else:
            piece = table.get(ch, text[i])
        out.append(piece[:1].upper() + piece[1:] if upper or (word_start and ch in table) else piece)
        i += step
    return "".join(out)


def to_latin(text: str) -> str:
    return _convert(text, LATIN, cyrillic=False)


def to_cyrillic(text: str) -> str:
    return _convert(text, CYRILLIC, cyrillic=True)
