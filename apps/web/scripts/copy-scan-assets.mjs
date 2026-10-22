// DEC-77: self-host tesseract.js (worker, LSTM core, eng data) as same-origin static assets for /app/scan.
// Copied from node_modules at build time into public/scan-assets (gitignored), so the repo stays binary-free.
import { copyFileSync, mkdirSync, existsSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const out = join(root, "public", "scan-assets");
const pkgDir = (name) => dirname(require.resolve(`${name}/package.json`));

const files = [
  [join(pkgDir("tesseract.js"), "dist", "worker.min.js"), "worker.min.js"],
  ...["tesseract-core-lstm.wasm.js", "tesseract-core-simd-lstm.wasm.js"].map((f) => [
    join(pkgDir("tesseract.js-core"), f),
    join("core", f),
  ]),
  [join(pkgDir("@tesseract.js-data/eng"), "4.0.0_best_int", "eng.traineddata.gz"), join("lang", "eng.traineddata.gz")],
];

for (const [src, rel] of files) {
  if (!existsSync(src)) throw new Error(`missing OCR asset: ${src}`);
  const dest = join(out, rel);
  mkdirSync(dirname(dest), { recursive: true });
  copyFileSync(src, dest);
}
console.log(`scan-assets: copied ${files.length} files to public/scan-assets`);
