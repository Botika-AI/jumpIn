#!/bin/bash
# Controlla che la documentazione in docs/ venga aggiornata quando cambia
# la struttura del codice o lo schema del database.
#
#   - Struttura: file AGGIUNTI, ELIMINATI o RINOMINATI in components/, pages/, lib/
#     o App.tsx  → serve un aggiornamento di docs/architettura.md
#   - Database: qualsiasi modifica a supabase/*.sql → serve docs/database.md
#
# Modalità:
#   check-docs.sh claude   Stop hook di Claude Code (legge JSON da stdin)
#   check-docs.sh commit   pre-commit di git (controlla i file in staging)
#
# Per saltare il controllo in un commit: git commit --no-verify

MODE="${1:-commit}"
cd "$(git rev-parse --show-toplevel 2>/dev/null)" || exit 0

STRUCT_RE='^(components/|pages/|lib/|App\.tsx$)'
DB_RE='^supabase/.*\.sql$'

if [ "$MODE" = "claude" ]; then
  INPUT="$(cat)"
  # Evita cicli: se Claude sta già continuando per questo hook, non bloccare di nuovo
  if [ "$(printf '%s' "$INPUT" | jq -r '.stop_hook_active // false' 2>/dev/null)" = "true" ]; then
    exit 0
  fi
  # Working tree rispetto all'ultimo commit (inclusi i file nuovi non tracciati)
  # Formato: "XY percorso" oppure "R  vecchio -> nuovo"
  CHANGES="$(git status --porcelain -uall 2>/dev/null)"
  STRUCT="$(printf '%s\n' "$CHANGES" | awk '{s=substr($0,1,2); p=substr($0,4); sub(/.* -> /,"",p); if (s ~ /[ADR?]/) print p}' | grep -E "$STRUCT_RE")"
  ALL_PATHS="$(printf '%s\n' "$CHANGES" | awk '{p=substr($0,4); sub(/.* -> /,"",p); print p}')"
else
  CHANGES="$(git diff --cached --name-status 2>/dev/null)"
  STRUCT="$(printf '%s\n' "$CHANGES" | awk -F'\t' '$1 ~ /^[ADR]/ {print $NF}' | grep -E "$STRUCT_RE")"
  ALL_PATHS="$(printf '%s\n' "$CHANGES" | awk -F'\t' '{print $NF}')"
fi

DB="$(printf '%s\n' "$ALL_PATHS" | grep -E "$DB_RE")"
ARCH_DOC="$(printf '%s\n' "$ALL_PATHS" | grep -x 'docs/architettura.md')"
DB_DOC="$(printf '%s\n' "$ALL_PATHS" | grep -x 'docs/database.md')"

MSG=""
if [ -n "$STRUCT" ] && [ -z "$ARCH_DOC" ]; then
  MSG="${MSG}- Struttura del codice cambiata (file aggiunti/eliminati/rinominati) ma docs/architettura.md non è aggiornato:
$(printf '%s\n' "$STRUCT" | sed 's/^/    /')
"
fi
if [ -n "$DB" ] && [ -z "$DB_DOC" ]; then
  MSG="${MSG}- Script SQL modificati ma docs/database.md non è aggiornato:
$(printf '%s\n' "$DB" | sed 's/^/    /')
"
fi

[ -z "$MSG" ] && exit 0

if [ "$MODE" = "claude" ]; then
  # Ricorda una sola volta per lo stesso insieme di modifiche
  MARKER="$(git rev-parse --git-dir)/claude-docs-check"
  HASH="$(printf '%s' "$MSG" | shasum | cut -d' ' -f1)"
  [ -f "$MARKER" ] && [ "$(cat "$MARKER")" = "$HASH" ] && exit 0
  printf '%s' "$HASH" > "$MARKER"
  REASON="Controllo documentazione:
${MSG}
Aggiorna i file in docs/ indicati (vedi le regole nel CLAUDE.md). Se secondo te l'aggiornamento non serve, spiegalo all'utente in una riga."
  jq -n --arg r "$REASON" '{decision: "block", reason: $r}'
  exit 0
fi

# Modalità commit
{
  echo ""
  echo "⚠️  Commit bloccato: la documentazione non è aggiornata."
  echo ""
  printf '%s' "$MSG"
  echo ""
  echo "Aggiorna i file in docs/ e aggiungili al commit."
  echo "Se l'aggiornamento non serve: git commit --no-verify"
  echo ""
} >&2
exit 1
