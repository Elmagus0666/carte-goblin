// restore-markers.js
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// ⚠️ Mets tes vraies clés ici (ou mieux : dans un fichier .env)
const supabaseUrl = process.env.SUPABASE_URL || "https://zkapxuybvmjjtlpcftne.supabase.co"; // ton URL Supabase
const supabaseKey = process.env.SUPABASE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InprYXB4dXlidm1qanRscGNmdG5lIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTYwNzY0NDEsImV4cCI6MjA3MTY1MjQ0MX0.YXBOU_Trf8BNVsR71lzl2lRrfLNUHaHHcjGcy9oufZ0"; // ta clé anon/public
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
