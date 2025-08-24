const express = require('express');
const fs = require('fs');
const cors = require('cors');
const app = express();
const PORT = process.env.PORT || 3000;
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL || "https://zkapxuybvmjjtlpcftne.supabase.co"; // ton URL Supabase
const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYXB4dXlidm1qanRscGNmdG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNzY0NDEsImV4cCI6MjA3MTY1MjQ0MX0.YXBOU_Trf8BNVsR71lzl2lRrfLNUHaHHcjGcy9oufZ0"; // ta clé anon/public
const supabase = createClient(supabaseUrl, supabaseKey);

// Middleware
app.use(cors());
app.use(express.json());

// Fonction utilitaire : nettoie le mapRef pour correspondre aux fichiers
function cleanMapRef(mapRef) {
  return mapRef.replace(/^map_/, ''); // supprime le "map_" si présent
}

// GET markers
app.get('/markers', async (req, res) => {
  const mapRef = (req.query.map || 'map_royaume').replace(/^map_/, '');
  const { data, error } = await supabase
    .from('markers')
    .select('*')
    .eq('map_ref', mapRef);

  if (error) {
    console.error(error);
    return res.status(500).json({ error: error.message });
  }

  res.json(data);
});

// POST markers (remplace tous les markers pour une map donnée)
app.post('/markers', async (req, res) => {
  const mapRef = (req.query.map || 'map_royaume').replace(/^map_/, '');
  const markers = req.body.map(m => ({ ...m, map_ref: mapRef }));

  try {
    // Supprime les anciens
    const { error: delError } = await supabase
      .from('markers')
      .delete()
      .eq('map_ref', mapRef);

    if (delError) throw delError;

    // Insère les nouveaux
    const { error: insError } = await supabase
      .from('markers')
      .insert(markers);

    if (insError) throw insError;

    res.json({ message: 'Marqueurs mis à jour avec succès.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
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

// Renvoie les entités (entities.json)
app.get('/entities', (req, res) => {
  const filePath = './data/entities.json';
  try {
    const entities = fs.readFileSync(filePath, 'utf8');
    res.json(JSON.parse(entities));
  } catch (error) {
    res.status(500).json({ message: 'Erreur lors du chargement de entities.json' });
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