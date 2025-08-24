const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Fonction utilitaire : nettoie le mapRef pour correspondre aux fichiers
function cleanMapRef(mapRef) {
  return mapRef.replace(/^map_/, ''); // supprime le "map_" si présent
}

// Charge les marqueurs depuis un fichier JSON spécifique à la carte
app.get('/markers', (req, res) => {
  let mapRef = req.query.map || 'map_royaume';

  mapRef = cleanMapRef(mapRef); // → ex: "map_magnimar" devient "magnimar"

  const filePath = `./data/markers_${mapRef}.json`;
  console.log(`Chemin du fichier : ${filePath}`);

  try {
    const markers = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(markers));
  } catch (error) {
    res.status(404).json({ message: `Fichier de marqueurs non trouvé pour la carte : ${mapRef}` });
  }
});

// Met à jour les marqueurs
app.post('/markers', (req, res) => {
  let mapRef = req.query.map || 'map_royaume';

  mapRef = cleanMapRef(mapRef);

  const filePath = `./data/markers_${mapRef}.json`;

  try {
    fs.writeFileSync(filePath, JSON.stringify(req.body, null, 2));
    res.json({ message: 'Marqueurs mis à jour avec succès.' });
  } catch (error) {
    res.status(500).json({ message: `Erreur lors de la mise à jour des marqueurs pour la carte : ${mapRef}` });
  }
});

// Renvoie la liste des cartes (maps.json)
app.get('/maps', (req, res) => {
  const filePath = './data/maps.json';
  try {
    const maps = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(maps));
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du chargement de maps.json' });
  }
});

// Renvoie la liste des types de markers (types.json)
app.get('/types', (req, res) => {
  const filePath = './data/types.json';
  try {
    const types = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(types));
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du chargement de types.json' });
  }
});


// Enregistre les actions des utilisateurs
app.post('/log', (req, res) => {
  const logEntry = `${new Date().toISOString()} - ${req.body.user}: ${req.body.action}\n`;
  fs.appendFileSync('./data/logs.txt', logEntry);
  res.json({ message: 'Log enregistré.' });
});

// Démarre le serveur
app.listen(PORT, () => {
  console.log(`Serveur en cours d'exécution sur http://localhost:${PORT}`);
});
// Sert les fichiers statiques du dossier courant (public, images, etc.)
app.use(express.static('public'));