#!/bin/bash
# push-github.sh
# Envia todas as alterações para o GitHub com um único comando.
# Uso: bash scripts/push-github.sh "mensagem de commit"
# Se nenhuma mensagem for passada, usa a data/hora atual como mensagem.

set -e

BRANCH=$(git rev-parse --abbrev-ref HEAD 2>/dev/null || echo "main")
MSG="${1:-"chore: atualização automática $(date '+%Y-%m-%d %H:%M:%S')"}"

echo "==> Verificando alterações..."
if git diff --quiet && git diff --cached --quiet && [ -z "$(git ls-files --others --exclude-standard)" ]; then
  echo "Nenhuma alteração para enviar. Repositório já está atualizado."
  exit 0
fi

echo "==> Adicionando todos os arquivos..."
git add -A

echo "==> Criando commit: \"$MSG\""
git commit -m "$MSG"

echo "==> Enviando para o GitHub (branch: $BRANCH)..."
git push origin "$BRANCH"

echo ""
echo "Pronto! Código enviado com sucesso para o GitHub."
