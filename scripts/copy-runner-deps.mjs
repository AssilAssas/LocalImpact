import fs from "node:fs";
import path from "node:path";

const rootNodeModules = path.join(process.cwd(), "node_modules");
const outNodeModules = path.join(process.cwd(), "runner-modules", "node_modules");

const seen = new Set();
const queue = ["prisma", "@prisma/client", "tsx", "bcryptjs"];

function scanPackage(pkgDir) {
  const pkgJsonPath = path.join(pkgDir, "package.json");
  if (!fs.existsSync(pkgJsonPath)) return;

  const pkg = JSON.parse(fs.readFileSync(pkgJsonPath, "utf8"));
  const deps = [
    ...Object.keys(pkg.dependencies ?? {}),
    ...Object.keys(pkg.optionalDependencies ?? {}),
  ];

  for (const dep of deps) {
    if (!seen.has(dep)) {
      queue.push(dep);
    }
  }

  const nestedNodeModules = path.join(pkgDir, "node_modules");
  if (!fs.existsSync(nestedNodeModules)) return;

  for (const entry of fs.readdirSync(nestedNodeModules)) {
    if (entry.startsWith(".")) continue;
    const entryPath = path.join(nestedNodeModules, entry);
    if (entry.startsWith("@")) {
      for (const sub of fs.readdirSync(entryPath)) {
        scanPackage(path.join(entryPath, sub));
      }
    } else {
      scanPackage(entryPath);
    }
  }
}

while (queue.length > 0) {
  const pkgName = queue.shift();
  if (!pkgName || seen.has(pkgName)) continue;

  const pkgDir = path.join(rootNodeModules, pkgName);
  if (!fs.existsSync(pkgDir)) continue;

  seen.add(pkgName);
  scanPackage(pkgDir);
}

fs.rmSync(outNodeModules, { recursive: true, force: true });
fs.mkdirSync(path.join(outNodeModules, ".bin"), { recursive: true });

for (const pkgName of [...seen, ".prisma"]) {
  const src = path.join(rootNodeModules, pkgName);
  const dest = path.join(outNodeModules, pkgName);
  if (fs.existsSync(src)) {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.cpSync(src, dest, { recursive: true, verbatimSymlinks: true });
  }
}

for (const binName of ["prisma", "tsx"]) {
  const src = path.join(rootNodeModules, ".bin", binName);
  const dest = path.join(outNodeModules, ".bin", binName);
  if (fs.existsSync(src)) {
    fs.cpSync(src, dest, { verbatimSymlinks: true });
  }
}

console.log(`Copied ${seen.size} runtime CLI packages (+ .prisma) to runner-modules.`);
