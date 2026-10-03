/**
 * Copies the PHP backend into build/ so the FTP upload carries it:
 *   api/   -> build/api/    (without tests, Composer files or a local config)
 *   admin/ -> build/admin/  (when it exists)
 *
 * Run after `composer install --no-dev` in api/ and after the React build.
 *   node scripts/deploy/stage-api.mjs [--build build]
 */
import fs from "fs";
import path from "path";

const args = process.argv.slice(2);
const buildIndex = args.indexOf("--build");
const BUILD = path.resolve(buildIndex === -1 ? "build" : args[buildIndex + 1]);

// Never shipped: tests, tooling, local secrets and caches.
const SKIP = [
  /^tests(\/|$)/,
  /^\.phpunit\.cache(\/|$)/,
  /^config\.php$/,
  /^config\.example\.php$/,
  /^composer\.(json|lock)$/,
  /^phpunit\.xml(\.dist)?$/,
  /(^|\/)\.git/,
  /\.md$/i,
  // the dependencies are staged separately (see vendorDir below)
  /^vendor(-dist)?(\/|$)/,
];

/**
 * The Composer install to ship: api/vendor-dist (a local `--no-dev` install
 * next to the dev one) or api/vendor. A dev install is refused: its autoloader
 * would require PHPUnit files that are never uploaded.
 */
function vendorDir(api) {
  for (const name of ["vendor-dist", "vendor"]) {
    const dir = path.join(api, name);
    if (!fs.existsSync(path.join(dir, "autoload.php"))) continue;
    const installed = JSON.parse(fs.readFileSync(path.join(dir, "composer", "installed.json"), "utf8"));
    if (installed.dev && (installed["dev-package-names"] || []).length) {
      if (name === "vendor-dist") continue;
      console.error(
        "[stage-api] api/vendor has dev packages. Run `composer install --no-dev` in api/ " +
          "(or COMPOSER_VENDOR_DIR=vendor-dist composer install --no-dev for a local copy)."
      );
      process.exit(1);
    }
    return dir;
  }
  console.error("[stage-api] no Composer install in api/: run `composer install --no-dev` there first.");
  process.exit(1);
}

function copyTree(from, to, rel = "") {
  let count = 0;
  for (const entry of fs.readdirSync(path.join(from, rel), { withFileTypes: true })) {
    const relPath = rel ? `${rel}/${entry.name}` : entry.name;
    if (SKIP.some((pattern) => pattern.test(relPath))) continue;
    const source = path.join(from, relPath);
    const target = path.join(to, relPath);
    if (entry.isDirectory()) {
      fs.mkdirSync(target, { recursive: true });
      count += copyTree(from, to, relPath);
    } else if (entry.isFile()) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(source, target);
      count += 1;
    }
  }
  return count;
}

if (!fs.existsSync(path.join(BUILD, "index.html"))) {
  console.error(`[stage-api] ${BUILD} has no index.html: run the React build first.`);
  process.exit(1);
}

for (const folder of ["api", "admin"]) {
  const source = path.resolve(folder);
  if (!fs.existsSync(source)) continue;
  const target = path.join(BUILD, folder);
  fs.rmSync(target, { recursive: true, force: true });
  fs.mkdirSync(target, { recursive: true });
  let files = copyTree(source, target);
  if (folder === "api") {
    const vendor = vendorDir(source);
    fs.mkdirSync(path.join(target, "vendor"), { recursive: true });
    files += copyTree(vendor, path.join(target, "vendor"));
  }
  console.log(`[stage-api] ${folder}/ -> ${path.relative(process.cwd(), target)} (${files} files)`);
}
