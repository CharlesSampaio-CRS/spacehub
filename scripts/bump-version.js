const fs = require("fs");
const path = require("path");

const pkgPath = path.join(__dirname, "..", "package.json");
const pkg = require(pkgPath);

// Incrementa patch version: x.y.z → x.y.(z+1)
let [major, minor, patch] = pkg.version.split(".").map(Number);
patch += 1;

pkg.version = `${major}.${minor}.${patch}`;

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log(`Versão atualizada para ${pkg.version}`);
