import { offlinePlaces } from "../sample/places";

test.each([
  ["Gyu", "en", "Gyumri"], ["гюм", "ru", "Гюмри"], ["Գյում", "hy", "Գյումրի"],
  ["Yer", "en", "Yerevan"], ["Երև", "hy", "Երևան"], ["ерев", "ru", "Ереван"],
])("%s finds %s", (q, lang, name) => {
  expect(offlinePlaces(q, lang as "en").map((p) => p.name)).toEqual([name]);
});

test("former name Leninakan finds Gyumri and says so", () => {
  const [p] = offlinePlaces("lenin", "en");
  expect(p.name).toBe("Gyumri");
  expect(p.former_names_matched[0].name).toBe("Leninakan");
});

test("other places and one letter find nothing; time zone is Yerevan's", () => {
  expect(offlinePlaces("Moscow", "en")).toEqual([]);
  expect(offlinePlaces("G", "en")).toEqual([]);
  expect(offlinePlaces("Yerevan", "en")[0].tz).toBe("Asia/Yerevan");
});
