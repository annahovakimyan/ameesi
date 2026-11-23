import pytest

from app.translit import to_cyrillic, to_latin


@pytest.mark.parametrize("hy,en,ru", [
    ("Ստեփանակերտ", "Stepanakert", "Степанакерт"),
    ("Շուշի", "Shushi", "Шуши"),
    ("Մարտակերտ", "Martakert", "Мартакерт"),
    ("Մարտունի", "Martuni", "Мартуни"),
    ("Հադրութ", "Hadrut", "Гадрут"),
    ("Ասկերան", "Askeran", "Аскеран"),
    ("Վանք", "Vank", "Ванк"),
    ("Լիսագոր", "Lisagor", "Лисагор"),
    ("Երևան", "Yerevan", "Ереван"),
    ("Գյումրի", "Gyumri", "Гюмри"),
    ("Վանաձոր", "Vanadzor", "Ванадзор"),
    ("Քարվաճառ", "Karvachar", "Карвачар"),
    ("Ոսկեվազ", "Voskevaz", "Воскеваз"),
    ("Եղեգնաձոր", "Yeghegnadzor", "Ехегнадзор"),
    ("Նոր Մարաղա", "Nor Maragha", "Нор Мараха"),
])
def test_known_spellings(hy, en, ru):
    assert to_latin(hy) == en
    assert to_cyrillic(hy) == ru


def test_non_armenian_text_passes_through():
    assert to_latin("Stepanakert 2") == "Stepanakert 2"
