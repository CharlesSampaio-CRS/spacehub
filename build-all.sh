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
  echo "Defina com: export GH_TOKEN=seu_token"
  exit 1
fi

# Puxa a imagem do Docker
docker pull electronuserland/builder:wine

# Rodando o Docker com as variáveis do repositório
docker run --rm -ti \
  -v "$PWD":/project \
  -e GH_TOKEN=$GH_TOKEN \
  -w /project \
  electronuserland/builder:wine \
  bash -c "
    echo '📦 Instalando dependências...';
    npm install;

    # Gerar configurações, incrementando a versão
    echo '🔧 Gerando config...';
    node scripts/generate-config.js;

    # Atualiza a versão no package.json
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

    # Obtém a versão atualizada para o commit
    VERSION=$(node -e 'console.log(require("./package.json").version)');

    # Fazendo commit e criando tag
    echo '🔧 Fazendo commit e criando tag...';
    git add package.json;
    git commit -m \"release: v\$VERSION\";
    git tag v\$VERSION;
    git push && git push --tags;

    # Build e publica
    echo '🚀 Buildando e publicando para Linux e Windows...';
    npx electron-builder --publish always --win --linux;
  "

echo "✅ Build e publicação finalizados! Verifique o release no GitHub."
