#!/bin/bash
# push-github.sh
# Envia todas as alterações para o GitHub com um único comando.
# Uso: bash scripts/push-github.sh "mensagem de commit"
# Se nenhuma mensagem for passada, usa a data/hora atual como mensagem.

set -e

# Garante que estamos na raiz do projeto (dois níveis acima de scripts/)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

# Verifica se o GITHUB_TOKEN está disponível
if [ -z "$GITHUB_TOKEN" ]; then
  echo "Erro: variável de ambiente GITHUB_TOKEN não encontrada."
  echo "Configure o secret GITHUB_TOKEN no Replit."
  exit 1
fi

# Atualiza (ou cria) o remote 'origin' com o token atual
REPO_URL="https://${GITHUB_TOKEN}@github.com/mapati/BizGuideAI.git"
if git remote get-url origin &>/dev/null; then
  git remote set-url origin "$REPO_URL"
else
  git remote add origin "$REPO_URL"
fi

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

echo "==> Sincronizando com o GitHub antes de enviar..."
git pull origin "$BRANCH" --no-rebase -X ours --quiet 2>/dev/null || true

echo "==> Enviando para o GitHub (branch: $BRANCH)..."
git push origin "$BRANCH"

echo ""
echo "Pronto! Código enviado com sucesso para o GitHub."
