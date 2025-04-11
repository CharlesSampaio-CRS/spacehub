#!/bin/bash

set -e

echo "🔧 Iniciando build multiplataforma com Docker (com Wine)..."

# Solicita o GH_TOKEN se não estiver definido
if [ -z "$GH_TOKEN" ]; then
  echo "🔑 Por favor, insira seu GitHub Token (GH_TOKEN):"
  read -s GH_TOKEN
  echo
fi

# Verifica se o GH_TOKEN está definido
if [ -z "$GH_TOKEN" ]; then
  echo "❌ Variável GH_TOKEN não está definida."
  exit 1
fi

# Puxa imagem docker do electron-builder com suporte ao Wine
docker pull electronuserland/builder:wine

# Roda o container com tudo pronto
docker run --rm -ti \
  -v "$PWD":/project \
  -e GH_TOKEN="$GH_TOKEN" \
  -w /project \
  electronuserland/builder:wine \
  bash -c "
    echo '📦 Instalando dependências...';
    npm install;

    echo '🔧 Gerando config...';
    node scripts/generate-config.js;

    echo '🚀 Atualizando versão...';
    node -e '
      const fs = require(\"fs\");
      const path = require(\"path\");
      const pkgPath = path.join(__dirname, \"package.json\");
      const pkg = require(pkgPath);
      let [major, minor, patch] = pkg.version.split(\".\").map(Number);
      patch += 1;
      const newVersion = \`\${major}.\${minor}.\${patch}\`;
      pkg.version = newVersion;
      fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2));
      console.log(\`Versão atualizada para \${newVersion}\`);
    ';

    VERSION=\$(node -e 'console.log(require(\"./package.json\").version)');

    echo '🔧 Fazendo commit e tag...';
    git config --global user.email \"you@example.com\"
    git config --global user.name \"Your Name\"
    git add package.json
    git commit -m \"release: v\$VERSION\" || echo '⚠️ Nenhuma alteração para commitar.'
    git tag -f v\$VERSION
    git push origin main
    git push origin --tags -f

    echo '🚀 Buildando e publicando...';
    npx electron-builder --publish always --win --linux
  "

echo "✅ Build e publicação finalizados! Verifique o release no GitHub."
