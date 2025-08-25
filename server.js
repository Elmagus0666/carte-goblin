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

// Ajouter un marker
app.post('/marker', async (req, res) => {
  const marker = req.body;

  try {
    const { data, error } = await supabase
      .from('markers')
      .insert(marker)
      .select(); // pour renvoyer l'ID créé

    if (error) throw error;

    res.json({ message: "Marker ajouté", marker: data[0] });
  } catch (err) {
    console.error("Erreur ajout marker:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Mettre à jour un marker
app.patch('/marker/:id', async (req, res) => {
  const { id } = req.params;
  const updates = req.body;

  try {
    const { data, error } = await supabase
      .from('markers')
      .update(updates)
      .eq('id', id)
      .select();

    if (error) throw error;

    res.json({ message: "Marker mis à jour", marker: data[0] });
  } catch (err) {
    console.error("Erreur update marker:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// Supprimer un marker
app.delete('/marker/:id', async (req, res) => {
  const { id } = req.params;

  try {
    const { error } = await supabase
      .from('markers')
      .delete()
      .eq('id', id);

    if (error) throw error;

    res.json({ message: "Marker supprimé", id });
  } catch (err) {
    console.error("Erreur suppression marker:", err.message);
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