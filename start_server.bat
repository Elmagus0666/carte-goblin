@echo off
pushd "F:\JDR\Goblin\carte-goblin"
echo Dossier courant: %CD%
echo Lancement sur http://localhost:8001
python -m http.server 8001
popd
pause
