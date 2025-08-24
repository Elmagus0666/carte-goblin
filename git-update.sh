#!/bin/bash

# Petit script pour automatiser add/commit/push

# Vérifie si un message a été passé
if [ -z "$1" ]
then
  echo "❌ Donne un message de commit :"
  echo "   ./git-update.sh 'Mon message'"
  exit 1
fi

# Ajoute les changements
git add -A

# Commit avec le message fourni
git commit -m "$1"

# Push vers main
git push origin main

echo "✅ Changements poussés avec succès !"
