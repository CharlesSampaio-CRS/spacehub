const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const pkgPath = path.join(__dirname, "..", "package.json");
const distPath = path.join(__dirname, "..", "dist");
const pkg = require(pkgPath);

// 🚀 0. Limpa build anterior
if (fs.existsSync(distPath)) {
  console.log("🧹 Removendo dist/ antigo...");
  fs.rmSync(distPath, { recursive: true, force: true });
}

// 🚀 1. Gera config
console.log("🛠️  Gerando config...");
execSync("node scripts/generate-config.js", { stdio: "inherit" });

// 🚀 2. Incrementa versão (patch)
let [major, minor, patch] = pkg.version.split(".").map(Number);
patch += 1;
const newVersion = `${major}.${minor}.${patch}`;
pkg.version = newVersion;
fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
console.log(`✅ Versão atualizada para ${newVersion}`);

// 🚀 3. Commit e tag no Git
console.log("🔧 Fazendo commit e criando tag...");
execSync("git add package.json", { stdio: "inherit" });
execSync(`git commit -m "release: v${newVersion}"`, { stdio: "inherit" });
execSync(`git tag v${newVersion}`, { stdio: "inherit" });
execSync("git push && git push --tags", { stdio: "inherit" });

// 🚀 4. Build e publicação
console.log("📦 Buildando e publicando...");
execSync("npx electron-builder --publish always", { stdio: "inherit" });

console.log("🎉 Release finalizado com sucesso!");
