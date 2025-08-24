const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000; // Utilise le port défini par Render ou 3000 par défaut

// Middleware
app.use(cors());
app.use(express.json());

// Charge les marqueurs depuis un fichier JSON
app.get('/markers', (req, res) => {
  const markers = fs.readFileSync('./data/markers.json', 'utf8');
  res.json(JSON.parse(markers));
});

// Met à jour les marqueurs
app.post('/markers', (req, res) => {
  const newMarkers = req.body;
  fs.writeFileSync('./data/markers.json', JSON.stringify(newMarkers, null, 2));
  res.json({ message: 'Marqueurs mis à jour avec succès.' });
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

// Charge les marqueurs depuis un fichier JSON spécifique à la carte
app.get('/markers', (req, res) => {
  const mapRef = req.query.map || 'map_magnimar'; // Par défaut, utilise "map_magnimar"
  const filePath = `./data/markers_${mapRef}.json`;

  try {
    const markers = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(markers));
  } catch (error) {
    res.status(404).json({ message: `Fichier de marqueurs non trouvé pour la carte : ${mapRef}` });
  }
}); 