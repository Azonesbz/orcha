#!/usr/bin/env bash
# Déploie le rôle service d'Orcha sur le VPS, depuis ce poste, par SSH.
#
# Idempotent : relançable sans rien casser. Il ne crée AUCUN secret — le
# fichier .env.production vit sur le serveur et n'est jamais transmis d'ici.
#
# Le code part d'ici par `git archive`, comme le fait le job `deployer-vps` de
# .github/workflows/livrer.yml. Ce n'est pas un choix de style : le VPS n'a pas
# de clé de déploiement — `ssh git@github.com` y répond « Permission denied » —
# donc il ne PEUT PAS cloner. Une version antérieure de ce script essayait, et
# sur un dépôt qui avait changé de nom par-dessus le marché.
set -euo pipefail

HOTE="${ORCHA_HOTE:-51.38.82.159}"
UTILISATEUR="${ORCHA_UTILISATEUR:-azones}"
DOMAINE="${ORCHA_DOMAINE:-orcha.vincentavz.com}"
# Le dossier que la livraison automatique alimente. En viser un autre —
# /opt/orcha, par exemple — monterait un second déploiement à côté du vrai,
# avec son propre conteneur et sans le .env.production.
DOSSIER="${ORCHA_DOSSIER:-/home/azones/orcha}"
RESEAU="${ORCHA_RESEAU:-proxy}"
# Ce qu'on livre. Une étiquette (`v0.3.1`) pour rejouer une version précise.
REF="${ORCHA_REF:-HEAD}"

vps() { ssh -o BatchMode=yes -o ConnectTimeout=10 "$UTILISATEUR@$HOTE" "$@"; }

echo "→ 1/6  Accès SSH"
if ! vps true 2>/dev/null; then
  echo "   ✗ $UTILISATEUR@$HOTE refuse la connexion."
  echo "     Clé à autoriser dans ~/.ssh/authorized_keys du serveur :"
  cat ~/.ssh/id_ed25519.pub
  exit 1
fi
# Le mode rescue d'OVH répond aussi au SSH : sans ce contrôle, on déploierait
# dans un système de secours dont le disque part au redémarrage.
if vps 'grep -qi bpo /usr/share/doc/openssh-server/changelog.Debian.gz 2>/dev/null || ! test -d /opt' 2>/dev/null; then
  banniere=$(nc -w 5 "$HOTE" 22 2>/dev/null | head -1 || true)
  case "$banniere" in
    *bpo*) echo "   ✗ Le serveur est en MODE RESCUE ($banniere)."
           echo "     Manager OVH → VPS → Démarrage → sur le disque, puis redémarre."
           exit 1;;
  esac
fi
echo "   ✓ $UTILISATEUR@$HOTE joignable"

echo "→ 2/6  DNS"
if ! host "$DOMAINE" >/dev/null 2>&1; then
  echo "   ✗ $DOMAINE ne résout pas. Pose un enregistrement A vers $HOTE."
  exit 1
fi
echo "   ✓ $DOMAINE résout"

echo "→ 3/6  Terrain : Docker, réseau, proxy inverse"
vps "command -v docker >/dev/null" || { echo "   ✗ Docker absent du VPS."; exit 1; }
if ! vps "docker network inspect '$RESEAU' >/dev/null 2>&1"; then
  echo "   · réseau '$RESEAU' absent — création"
  vps "docker network create '$RESEAU'" >/dev/null
fi
proxy=$(vps "docker ps --format '{{.Image}} {{.Names}}' 2>/dev/null | grep -iE 'traefik|nginx|caddy|haproxy' | head -3" || true)
proxy_hote=$(vps "systemctl is-active nginx caddy haproxy 2>/dev/null | grep -c '^active'" || echo 0)
if [ -n "$proxy" ]; then
  echo "   ✓ proxy en conteneur :"; echo "$proxy" | sed 's/^/       /'
elif [ "${proxy_hote:-0}" -gt 0 ]; then
  echo "   ✓ proxy sur l'hôte (nginx/caddy/haproxy actif)"
  echo "     ⚠️ Il ne verra pas le conteneur par le réseau Docker : publie un port"
  echo "        local et fais pointer le vhost dessus, ou attache le proxy à '$RESEAU'."
else
  echo "   ⚠️ Aucun proxy inverse détecté. Le conteneur tournera sans être routé,"
  echo "      et $DOMAINE ne répondra pas. À régler avant de compter sur l'URL."
fi

echo "→ 4/6  Code à jour"
# `git archive` ne connaît que ce qui est committé. Sans cet avertissement, on
# croit livrer ce qu'on a sous les yeux et on livre le dernier commit.
if ! git diff --quiet HEAD 2>/dev/null; then
  echo "   ⚠️ Des modifications ne sont pas committées : elles NE partiront PAS."
fi
livree=$(git rev-parse --short "$REF")
# Un dossier neuf plutôt qu'une extraction par-dessus : un tar recouvre mais ne
# supprime jamais. Un fichier retiré par un commit resterait sur le serveur et
# casserait le typage au build — c'est arrivé, et ça ne se voit qu'à la
# compilation dans le conteneur.
vps "rm -rf '$DOSSIER.nouveau' && mkdir -p '$DOSSIER.nouveau'"
git archive --format=tar "$REF" | gzip | vps "tar xzf - -C '$DOSSIER.nouveau'"
echo "   ✓ $REF ($livree) déposé dans $DOSSIER.nouveau"

echo "→ 5/6  Secrets de production, puis bascule"
if ! vps "test -s '$DOSSIER/.env.production'"; then
  echo "   ✗ $DOSSIER/.env.production absent ou vide."
  echo "     Sur le serveur : cp $DOSSIER.nouveau/.env.production.exemple $DOSSIER/.env.production"
  echo "     puis remplis-le LÀ-BAS — rien de secret ne transite par ce poste."
  vps "rm -rf '$DOSSIER.nouveau'"
  exit 1
fi
# Le secret ne fait que glisser d'un dossier à l'autre, sur le serveur. Il ne
# remonte jamais ici, et n'entre jamais dans l'archive : `git archive` ne peut
# de toute façon pas le contenir, il n'est pas suivi.
vps "cp -p '$DOSSIER/.env.production' '$DOSSIER.nouveau/.env.production'"
# L'ancien reste sous la main : une bascule ratée se défait par un `mv`.
vps "rm -rf '$DOSSIER.ancien' \
     && mv '$DOSSIER' '$DOSSIER.ancien' \
     && mv '$DOSSIER.nouveau' '$DOSSIER'"
echo "   ✓ .env.production repris, bascule faite (retour : $DOSSIER.ancien)"

echo "→ 6/6  Construction et démarrage"
# Les NEXT_PUBLIC_* sont inscrites dans le paquet à la compilation : `build` est
# obligatoire, un simple `up` servirait l'ancien paquet.
vps "cd '$DOSSIER' && set -a && . ./.env.production && set +a && docker compose build --quiet && docker compose up -d"

echo "   attente de l'état « healthy »…"
etat=inconnu
for _ in $(seq 1 30); do
  etat=$(vps "cd '$DOSSIER' && set -a && . ./.env.production && set +a \
              && docker compose ps --format '{{.Health}}' 2>/dev/null | head -1" || true)
  [ "$etat" = "healthy" ] && break
  sleep 4
done
echo "   conteneur : ${etat:-inconnu}"

echo
# Les routes du produit libre. `/tarif`, `/merci` et `/compte` ont disparu avec
# le paiement : les contrôler affichait trois 404 qui ressemblaient à une panne.
echo "Contrôle public sur https://$DOMAINE"
attendu=0
for route in /produit /mentions /confidentialite; do
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$DOMAINE$route" || echo injoignable)
  [ "$code" = "200" ] || attendu=1
  printf "  %-18s %s\n" "$route" "$code"
done
# La racine appartient au rôle local, éteint ici : proxy.ts la renvoie vers la
# vitrine. C'est donc 307 qu'on attend, pas 404 — un 404 dirait que la
# redirection est tombée.
racine=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "https://$DOMAINE/" || echo '-')
[ "$racine" = "307" ] || attendu=1
printf "  %-18s %s  (307 attendu : la racine mène à la vitrine)\n" "/" "$racine"

echo
if [ "$attendu" = "0" ]; then
  echo "En ligne. Retour arrière si besoin :"
  echo "  ssh $UTILISATEUR@$HOTE 'rm -rf $DOSSIER && mv $DOSSIER.ancien $DOSSIER \\"
  echo "    && cd $DOSSIER && set -a && . ./.env.production && set +a \\"
  echo "    && docker compose build && docker compose up -d'"
else
  echo "✗ Une route ne répond pas comme attendu — le déploiement est à vérifier."
  exit 1
fi
