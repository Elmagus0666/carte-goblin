// import-markers.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ⚠️ Mets tes vraies clés ici (ou mieux : dans un fichier .env)
const supabaseUrl = process.env.SUPABASE_URL || "https://zkapxuybvmjjtlpcftne.supabase.co"; // ton URL Supabase
const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYXB4dXlidm1qanRscGNmdG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNzY0NDEsImV4cCI6MjA3MTY1MjQ0MX0.YXBOU_Trf8BNVsR71lzl2lRrfLNUHaHHcjGcy9oufZ0"; // ta clé anon/public
const supabase = createClient(supabaseUrl, supabaseKey);

// Dossier contenant maps.json + markers_*.json
const dataDir = path.join(__dirname, 'data');

// Charger la config des cartes
const maps = JSON.parse(fs.readFileSync(path.join(dataDir, 'maps.json'), 'utf8'));

// Vérifie si on est en mode "dry-run"
const dryRun = process.argv.includes('--dry-run');

// Fichier backup
const backupFile = path.join(dataDir, `backup_markers_${Date.now()}.json`);

(async () => {
  // 🔹 Étape 1 : faire une sauvegarde de tous les markers actuels
  if (!dryRun) {
    const { data: allMarkers, error } = await supabase.from('markers').select('*');
    if (error) {
      console.error("❌ Impossible de récupérer les markers pour backup:", error.message);
    } else {
      fs.writeFileSync(backupFile, JSON.stringify(allMarkers, null, 2), 'utf8');
      console.log(`📦 Backup effectué dans ${backupFile} (${allMarkers.length} markers sauvegardés)`);
    }
  }

  // 🔹 Étape 2 : importer chaque fichier JSON
  for (const map of maps) {
    const slug = map.slug; // ex: "royaume", "magnimar"
    const file = `markers_${slug}.json`;
    const filePath = path.join(dataDir, file);

    if (!fs.existsSync(filePath)) {
      console.log(`⚠️ Pas de fichier ${file}, on saute cette map (${slug})`);
      continue;
    }

    const raw = fs.readFileSync(filePath, 'utf8');
    let markers = JSON.parse(raw);

    // Corrige si JSON du type [[ {...}, {...} ]]
    if (Array.isArray(markers) && markers.length === 1 && Array.isArray(markers[0])) {
      markers = markers[0];
    }

    console.log(`→ Trouvé ${markers.length} markers dans ${file} (map_ref=${slug})`);

    // Prépare les données pour la DB
    const toInsert = markers.map(m => ({
      map_ref: slug,
      x: m.x,
      y: m.y,
      category: m.category,
      title: m.title,
      attrs: m.attrs || {}
    }));

    if (dryRun) {
      console.log(`(dry-run) ${slug} → ${JSON.stringify(toInsert, null, 2)}`);
      continue;
    }

    if (toInsert.length > 0) {
      // Supprime les anciens markers de cette carte
      const { error: delError } = await supabase.from('markers').delete().eq('map_ref', slug);
      if (delError) {
        console.error(`❌ Erreur suppression anciens markers ${slug}:`, delError.message);
        continue;
      }

      // Insère les nouveaux
      const { error: insError } = await supabase.from('markers').insert(toInsert);
      if (insError) {
        console.error(`❌ Erreur import ${file}:`, insError.message);
      } else {
        console.log(`✅ ${file} importé avec succès`);
      }
    }
  }

  console.log("🎉 Import terminé !");
})();
