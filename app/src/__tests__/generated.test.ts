import { execFileSync } from "node:child_process";
import { join } from "node:path";

test("generated tokens and glossary match design/tokens.json and content/glossary.json", () => {
  expect(() =>
    execFileSync("node", [join(__dirname, "..", "..", "scripts", "generate.mjs"), "--check"], { stdio: "pipe" }),
  ).not.toThrow();
});
