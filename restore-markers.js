// restore-markers.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ⚠️ Mets tes vraies clés ici (ou mieux : dans un fichier .env)
const supabaseUrl = process.env.SUPABASE_URL || "https://xxxx.supabase.co";
const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJI..."; // clé anon
const supabase = createClient(supabaseUrl, supabaseKey);

// Fichier backup à restaurer (passé en argument CLI)
const backupFile = process.argv[2];

if (!backupFile) {
  console.error("❌ Utilisation : node restore-markers.js <backup_file.json>");
  process.exit(1);
}

// Lecture du fichier
const filePath = path.isAbsolute(backupFile)
  ? backupFile
  : path.join(__dirname, 'data', backupFile);

if (!fs.existsSync(filePath)) {
  console.error(`❌ Fichier non trouvé : ${filePath}`);
  process.exit(1);
}

const raw = fs.readFileSync(filePath, 'utf8');
let markers = JSON.parse(raw);

(async () => {
  console.log(`📦 Restauration depuis ${filePath} (${markers.length} markers)`);

  try {
    // Efface tout
    const { error: delError } = await supabase.from('markers').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (delError) throw delError;

    // Réinsère tout
    const { error: insError } = await supabase.from('markers').insert(markers);
    if (insError) throw insError;

    console.log("✅ Restauration terminée !");
  } catch (err) {
    console.error("❌ Erreur restauration :", err.message);
  }
})();
