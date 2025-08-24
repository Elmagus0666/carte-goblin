// Helper: read JSON
async function loadJSON(path) {
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Échec de chargement ${path}`);
  return res.json();
}

// URL param ?map=slug
function getMapSlug() {
  const url = new URL(window.location.href);
  return url.searchParams.get('map') || 'royaume';
}

// State
let MAPS = [];
let TYPES = {};
let ENTITIES = {};
let CURRENT_MAP = null;
let CURRENT_MARKERS = [];
let leafletMap = null;
let leafletLayer = null;
let leafletMarkers = [];

// ---------------------- INIT ----------------------
async function init() {
  // Load data via API Express
  const [maps, types, entitiesArr] = await Promise.all([
    loadJSON('/maps'),
    loadJSON('/types'),
    loadJSON('/entities')   // <-- corrigé ici
  ]);

  MAPS = maps;
  TYPES = types;
  ENTITIES = Object.fromEntries(entitiesArr.map(e => [e.id, e]));

  // Map selector
  const sel = document.getElementById('mapSelect');
  MAPS.forEach(m => {
    const opt = document.createElement('option');
    opt.value = m.slug;
    opt.textContent = m.title;
    sel.appendChild(opt);
  });
  sel.addEventListener('change', () => {
    window.location.search = `?map=${sel.value}`;
  });

  // Load current map
  const slug = getMapSlug();
  sel.value = slug;
  CURRENT_MAP = MAPS.find(m => m.slug === slug) || MAPS[0];
  document.getElementById('title').textContent = `Carte : ${CURRENT_MAP.title}`;

  await loadMarkersForCurrentMap();
  buildFilters();
  renderMap();
}



// ---------------------- LOAD MARKERS ----------------------
async function loadMarkersForCurrentMap() {
  const slug = CURRENT_MAP.slug;

  // Appel API au backend
  let data = await loadJSON(`/markers?map=map_${slug}`);

  // Corrige si JSON du type [[ {...}, {...} ]]
  if (Array.isArray(data) && data.length === 1 && Array.isArray(data[0])) {
    data = data[0];
  }

  CURRENT_MARKERS = data;
  console.log("Markers chargés:", slug, CURRENT_MARKERS);
}


// ---------------------- FILTERS ----------------------
function buildFilters() {
  const filtersDiv = document.getElementById('filters');
  filtersDiv.innerHTML = ''; // Réinitialise les filtres

  // Récupère toutes les catégories, en excluant "Ville" si la carte actuelle n'est pas de type "world"
  const cats = Object.keys(TYPES).filter(cat => {
    if (cat === 'city' && CURRENT_MAP.type !== 'world') return false;
    return true;
  });

  // Crée une case à cocher pour chaque catégorie
  cats.forEach(cat => {
    const label = document.createElement('label');
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = true; // Par défaut, tous les filtres sont activés
    checkbox.dataset.category = cat;
    checkbox.addEventListener('change', renderMarkers); // Recharge les marqueurs quand un filtre change

    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(TYPES[cat]?.label || cat));
    filtersDiv.appendChild(label);
  });
}

// ---------------------- RENDER MAP ----------------------
function renderMap() {
  const bounds = [[0,0], [CURRENT_MAP.height, CURRENT_MAP.width]];
  if (!leafletMap) {
    leafletMap = L.map('map', { crs: L.CRS.Simple, minZoom: -5 });
  }
  if (leafletLayer) leafletMap.removeLayer(leafletLayer);
  leafletLayer = L.imageOverlay(CURRENT_MAP.image, bounds).addTo(leafletMap);
  leafletMap.fitBounds(bounds);

  renderMarkers();
}

// ---------------------- POPUPS ----------------------
function entityFieldsHtml(entity) {
  const def = TYPES[entity.type] || {};
  const fields = def.fields || Object.keys(entity);
  return fields.map(key => {
    const val = entity[key];
    if (val == null) return '';
    if (Array.isArray(val)) {
      return `<div><b>${key}</b>: ${val.join(', ')}</div>`;
    }
    return `<div><b>${key}</b>: ${val}</div>`;
  }).join('');
}

function markerPopupHtml(m) {
  const catLabel = TYPES[m.category]?.label || m.category;
  let html = `<b>${m.title}</b> <span class="badge">${catLabel}</span>`;
  if (m.entity_id && ENTITIES[m.entity_id]) {
    html += `<div style="margin-top:6px">${entityFieldsHtml(ENTITIES[m.entity_id])}</div>`;
  }
  if (m.attrs) {
    const parts = [];
    for (const [k, v] of Object.entries(m.attrs)) {
      parts.push(`<div><b>${k}</b>: ${Array.isArray(v) ? v.join(', ') : v}</div>`);
    }
    if (parts.length) html += `<div style="margin-top:6px">${parts.join('')}</div>`;
  }
  if (m.link_to) {
    html += `<div style="margin-top:8px"><a class="link" href="?map=${m.link_to}">→ Ouvrir la carte</a></div>`;
  }
  return html;
}

// ---------------------- ICONS ----------------------
function makeIcon(cat) {
  const iconPath = TYPES[cat]?.icon;
  if (!iconPath) return L.Icon.Default();
  return L.icon({
    iconUrl: `icons/${iconPath.split('/').pop()}`, // Force le chemin relatif au dossier icons
    iconSize: [32, 32],
    iconAnchor: [16, 32],
    popupAnchor: [0, -32]
  });
}

// ---------------------- COORDONNÉES HELPER ----------------------
let coordHelperOn = false;
let lastCoordPopup = null;

function createCoordHelperUI() {
  const controls = document.getElementById('controls');
  const btn = document.createElement('button');
  btn.id = 'coordBtn';
  btn.textContent = 'Coordonnées: OFF';
  btn.style.cssText = 'padding:6px 10px;margin-left:8px;border-radius:6px;border:1px solid #444;background:#111;color:#fff;cursor:pointer;';
  btn.onclick = () => {
    coordHelperOn = !coordHelperOn;
    btn.textContent = `Coordonnées: ${coordHelperOn ? 'ON' : 'OFF'}`;
    leafletMap.getContainer().style.cursor = coordHelperOn ? 'crosshair' : '';
    if (!coordHelperOn && lastCoordPopup) { lastCoordPopup.remove(); lastCoordPopup = null; }
  };
  controls.appendChild(btn);

  leafletMap.on('click', async (e) => {
    if (!coordHelperOn) return;
    const x = Math.round(e.latlng.lng), y = Math.round(e.latlng.lat);
    const text = `x: ${x}, y: ${y}`;
    if (lastCoordPopup) lastCoordPopup.remove();
    lastCoordPopup = L.popup({ closeOnClick: false, autoClose: true })
      .setLatLng(e.latlng)
      .setContent(`<b>Coordonnées</b><br>${text}<br><small>(copiées)</small>`)
      .openOn(leafletMap);
    try { await navigator.clipboard.writeText(text); } catch {}
    console.log(text);
  });
}

// ---------------------- EDIT MODE ----------------------
let EDIT_MODE = false;
let ADD_MODE = false;
let ADD_CATEGORY = null;
let lastEditedIndex = null;

function createEditorUI() {
  const controls = document.getElementById('controls');

  // Bouton Édition
  const btnEdit = document.createElement('button');
  btnEdit.textContent = 'Édition: OFF';
  btnEdit.onclick = () => {
    EDIT_MODE = !EDIT_MODE;
    btnEdit.textContent = `Édition: ${EDIT_MODE ? 'ON' : 'OFF'}`;
    leafletMap.getContainer().style.cursor = EDIT_MODE ? 'pointer' : '';
  };
  controls.appendChild(btnEdit);

  // Bouton Ajouter
  const btnAdd = document.createElement('button');
  btnAdd.textContent = '+ Ajouter un marker';
  btnAdd.onclick = () => {
    if (!EDIT_MODE) {
      alert("Activez le mode édition pour ajouter un marqueur.");
      return;
    }

    // Liste des catégories possibles (exclut city si carte != world)
    const cats = Object.keys(TYPES).filter(cat => {
      if (cat === 'city' && CURRENT_MAP.type !== 'world') return false;
      return true;
    });

    // Petit popup avec menu déroulant
    const select = document.createElement('select');
    select.innerHTML = cats.map(cat => `<option value="${cat}">${TYPES[cat]?.label || cat}</option>`).join('');

    const dialog = document.createElement('div');
    dialog.style.position = 'fixed';
    dialog.style.top = '50%';
    dialog.style.left = '50%';
    dialog.style.transform = 'translate(-50%, -50%)';
    dialog.style.background = '#fff';
    dialog.style.padding = '20px';
    dialog.style.boxShadow = '0 4px 8px rgba(0, 0, 0, 0.2)';
    dialog.style.zIndex = '1000';

    const title = document.createElement('h3');
    title.textContent = 'Choisissez une catégorie :';
    dialog.appendChild(title);
    dialog.appendChild(select);

    const btnConfirm = document.createElement('button');
    btnConfirm.textContent = 'Confirmer';
    btnConfirm.style.marginTop = '10px';
    btnConfirm.onclick = () => {
      ADD_MODE = true;
      ADD_CATEGORY = select.value;
      leafletMap.getContainer().style.cursor = 'crosshair';
      document.body.removeChild(dialog); // ferme le popup
    };
    dialog.appendChild(btnConfirm);

    const btnCancel = document.createElement('button');
    btnCancel.textContent = 'Annuler';
    btnCancel.style.marginLeft = '10px';
    btnCancel.onclick = () => {
      document.body.removeChild(dialog);
    };
    dialog.appendChild(btnCancel);

    document.body.appendChild(dialog);
  };
  controls.appendChild(btnAdd);

  // Bouton Sauvegarder vers le backend
  const btnSaveServer = document.createElement('button');
  btnSaveServer.textContent = 'Sauvegarder (serveur)';
  btnSaveServer.onclick = async () => {
    const slug = CURRENT_MAP.slug;
    try {
      const res = await fetch(`/markers?map=map_${slug}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(CURRENT_MARKERS, null, 2)
      });
      const result = await res.json();
      alert(result.message || 'Sauvegarde réussie !');
    } catch (err) {
      alert('Erreur lors de la sauvegarde sur le serveur.');
      console.error(err);
    }
  };
  controls.appendChild(btnSaveServer);

  // Ajout par clic (après confirmation d'une catégorie)
  leafletMap.on('click', (e) => {
    if (!EDIT_MODE || !ADD_MODE) return;

    const x = Math.round(e.latlng.lng), y = Math.round(e.latlng.lat);
    const m = {
      x, y,
      category: ADD_CATEGORY,
      title: 'Nouveau point',
      attrs: {},
      map_ref: CURRENT_MAP.id
    };

    CURRENT_MARKERS.push(m);
    renderMarkers();

    const mm = leafletMarkers[leafletMarkers.length - 1];
    if (mm) mm.openPopup();

    // Reset après ajout
    ADD_MODE = false;
    ADD_CATEGORY = null;
    leafletMap.getContainer().style.cursor = EDIT_MODE ? 'pointer' : '';
  });
}


function markerPopupHtmlEditable(m, idx) {
  if (!EDIT_MODE) return markerPopupHtml(m);
  const cats = Object.keys(TYPES);
  const fields = (TYPES[m.category]?.fields) || [];
  const attrs = m.attrs || {};
  const attrsRows = fields.map(f => {
    const val = Array.isArray(attrs[f]) ? attrs[f].join(', ') : (attrs[f] ?? '');
    return `<label><small>${f}</small><input data-attr="${f}" type="text" value="${val}" style="width:100%"></label>`;
  }).join('');

  return `
    <b>Éditer : ${m.title}</b>
    <label><small>Titre</small><input id="fldTitle" type="text" value="${m.title}" style="width:100%"></label>
    <label><small>Catégorie</small>
      <select id="fldCategory" style="width:100%">
        ${cats.map(c => `<option value="${c}" ${c===m.category?'selected':''}>${TYPES[c]?.label||c}</option>`).join('')}
      </select>
    </label>
    ${attrsRows}
    <button id="btnSave">Enregistrer</button>
    <button id="btnDelete">Supprimer</button>
    <div style="margin-top:6px;font-size:12px;color:#aaa">x: ${m.x}, y: ${m.y}</div>
  `;
}

// ---------------------- RENDER MARKERS ----------------------
function renderMarkers() {
  // Supprime les marqueurs existants
  leafletMarkers.forEach(mm => mm.remove());
  leafletMarkers = [];

  // Affiche tous les marqueurs sans appliquer de filtre
  CURRENT_MARKERS.forEach((m, idx) => {
    const marker = L.marker([m.y, m.x], { icon: makeIcon(m.category) }).addTo(leafletMap);

    // Lie une popup vide, qui sera mise à jour dynamiquement
    marker.bindPopup('', { autoClose: true, closeOnClick: true });

    marker.on('popupopen', () => {
      // Génère le HTML selon le mode
      const html = markerPopupHtmlEditable(m, idx);
      marker.setPopupContent(html);

      if (!EDIT_MODE) return; // Lecture seule si le mode édition est désactivé
      lastEditedIndex = idx;

      const elTitle = document.getElementById('fldTitle');
      const elCat = document.getElementById('fldCategory');

      // Sauvegarde
      const btnSave = document.getElementById('btnSave');
      if (btnSave) {
        btnSave.onclick = () => {
          const mm = CURRENT_MARKERS[lastEditedIndex];
          mm.title = elTitle.value;
          mm.category = elCat.value;
          const def = TYPES[mm.category] || {};
          const fields = def.fields || [];
          mm.attrs = {};
          fields.forEach(f => {
            const inp = document.querySelector(`[data-attr="${f}"]`);
            if (inp) mm.attrs[f] = inp.value;
          });
          renderMarkers();
        };
      }

      // Suppression
      const btnDelete = document.getElementById('btnDelete');
      if (btnDelete) {
        btnDelete.onclick = () => {
          CURRENT_MARKERS.splice(lastEditedIndex, 1);
          renderMarkers();
        };
      }

      // Changement de catégorie -> recharge la popup
      if (elCat) {
        elCat.onchange = () => {
          const mm = CURRENT_MARKERS[lastEditedIndex];
          mm.category = elCat.value;
          mm.attrs = {};
          renderMarkers();
        };
      }
    });

    leafletMarkers.push(marker);
  });
}



// ---------------------- HOOK INIT ----------------------
(() => {
  const oldInit = init;
  window.init = async () => {
    await oldInit().catch(err => {
      alert('Erreur de chargement: ' + err.message);
      console.error(err);
    });
    createCoordHelperUI();
    createEditorUI();
  };
})();
