import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { BOUTIQUES, fmt } from "../constants.js";
import { ErrorBanner, selectStyle } from "../components/Shared.jsx";
import { cleNom } from "../components/LieuxChamps.jsx";

const jourIso = (d) => d.toISOString().slice(0, 10);
const carte = { background: "#FFFFFF", border: "1px solid #EAE1D2" };
const virgule = (n) => (n == null ? "—" : String(n).replace(".", ",") + " %");

function Tableau({ colonnes, lignes, vide = "Rien à afficher sur cette période." }) {
  if (!lignes.length) return <p className="text-sm py-4" style={{ color: "#6B5D52" }}>{vide}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm" style={{ minWidth: 520 }}>
        <thead>
          <tr style={{ color: "#6B5D52", borderBottom: "1px solid #EAE1D2" }}>
            {colonnes.map((c, i) => <th key={c.titre} className={`py-2 ${i === 0 ? "text-left" : "text-right"}`}>{c.titre}</th>)}
          </tr>
        </thead>
        <tbody>
          {lignes.map((l, k) => (
            <tr key={k} style={{ borderTop: "1px solid #EFE7D9" }}>
              {colonnes.map((c, i) => <td key={c.titre} className={`py-2 ${i === 0 ? "text-left" : "text-right"}`}>{c.valeur(l)}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Statistiques ─────────────────────────────────────────────────────────────
export function Statistiques() {
  const [dateDebut, setDateDebut] = useState(jourIso(new Date(Date.now() - 30 * 86400000)));
  const [dateFin, setDateFin] = useState(jourIso(new Date()));
  const [boutique, setBoutique] = useState("");
  const [vue, setVue] = useState("livraisons");
  const [zoneFiltre, setZoneFiltre] = useState(""); // lot 1 (B4) : "" = toutes, "CI", "HORS_CI"
  const { fonctions } = useAuth();
  const lot1 = !!fonctions.lot1;
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const valide = dateDebut && dateFin && dateDebut <= dateFin;

  const load = useCallback(async () => {
    if (!valide) return;
    try { setError(""); setD(await api.referentiels.statistiques({ dateDebut, dateFin, boutique })); } catch (e) { setError(e.message); }
  }, [dateDebut, dateFin, boutique, valide]);
  useEffect(() => { load(); }, [load]);

  const onglet = (id, label) => (
    <button key={id} type="button" onClick={() => setVue(id)} className="px-3 py-1.5 rounded-lg text-sm font-medium"
      style={vue === id ? { background: "#8C3B2E", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>{label}</button>
  );
  const zoneLibelle = { CI: "Côte d'Ivoire", HORS_CI: "Hors Côte d'Ivoire", NON_PRECISEE: "Non précisée" };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Du</label><input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={selectStyle} /></div>
        <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Au</label><input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={selectStyle} /></div>
        <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Boutique</label>
          <select value={boutique} onChange={(e) => setBoutique(e.target.value)} style={selectStyle}><option value="">Les deux</option>{BOUTIQUES.map((b) => <option key={b}>{b}</option>)}</select></div>
      </div>
      {!valide && <p className="text-xs mb-3" style={{ color: "#B04A3B" }}>Choisis deux dates, la première avant la seconde (ou le même jour).</p>}
      <ErrorBanner error={error} onClose={() => setError("")} />
      {lot1 && vue === "expeditions" && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {[["", "Toutes"], ["CI", "En Côte d'Ivoire"], ["HORS_CI", "Hors Côte d'Ivoire"]].map(([z, t]) => (
            <button key={z} type="button" onClick={() => setZoneFiltre(z)} className="px-3 py-1.5 rounded-lg text-sm font-medium"
              style={zoneFiltre === z ? { background: "#2B2320", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>{t}</button>
          ))}
        </div>
      )}
      <div className="flex gap-2 mb-4 flex-wrap">{onglet("livraisons", "Livraisons par lieu")}{onglet("expeditions", "Expéditions par destination")}{onglet("livreurs", "Par livreur")}</div>

      {d && vue === "livraisons" && (
        <div className="space-y-6">
          <p className="text-sm" style={{ color: "#6B5D52" }}>
            {d.livraisons.totalBons} livraison{d.livraisons.totalBons > 1 ? "s" : ""} sur la période
            {d.livraisons.nbSansCommune > 0 && <> dont {d.livraisons.nbSansCommune} sans commune (livraisons enregistrées avant la mise en place des communes).</>}
          </p>
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">Par commune</p>
            <Tableau lignes={d.livraisons.parCommune} colonnes={[
              { titre: "Commune", valeur: (l) => l.commune }, { titre: "Livraisons", valeur: (l) => l.nbBons }, { titre: "Part", valeur: (l) => virgule(l.partBons) },
              { titre: "Paires emportées", valeur: (l) => l.pairesEmportees }, { titre: "Ventes réalisées (F)", valeur: (l) => fmt(l.ca) }]} />
          </div>
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">Quartiers les plus livrés</p>
            <Tableau vide="Aucun quartier saisi sur cette période." lignes={d.livraisons.parQuartier} colonnes={[
              { titre: "Quartier", valeur: (l) => `${l.quartier} (${l.commune})` }, { titre: "Livraisons", valeur: (l) => l.nbBons }, { titre: "Ventes réalisées (F)", valeur: (l) => fmt(l.ca) }]} />
          </div>
        </div>
      )}

      {d && vue === "expeditions" && (
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-3">
            {["CI", "HORS_CI", "NON_PRECISEE"].map((z) => (
              <div key={z} className="rounded-xl p-4" style={carte}>
                <p className="text-xs mb-1" style={{ color: "#6B5D52" }}>{zoneLibelle[z]}</p>
                <p className="font-display text-2xl font-semibold">{d.expeditions.zones[z].nb}</p>
                <p className="text-xs mt-1" style={{ color: "#6B5D52" }}>{fmt(d.expeditions.zones[z].ca)} F</p>
              </div>
            ))}
          </div>
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">Par destination</p>
            <Tableau lignes={d.expeditions.parLieu.filter((l) => !lot1 || !zoneFiltre || l.zone === zoneFiltre)} colonnes={[
              { titre: "Destination", valeur: (l) => l.lieu }, { titre: "Zone", valeur: (l) => zoneLibelle[l.zone] }, { titre: "Expéditions", valeur: (l) => l.nbVentes },
              { titre: "Part", valeur: (l) => virgule(l.part) }, { titre: "Paires", valeur: (l) => l.paires }, { titre: "Montant (F)", valeur: (l) => fmt(l.ca) }]} />
          </div>
        </div>
      )}

      {d && vue === "livreurs" && (
        <div className="rounded-xl p-4" style={carte}>
          <p className="text-sm font-medium mb-1">Par livreur</p>
          <p className="text-xs mb-3" style={{ color: "#6B5D52" }}>« Vendues / retournées » se calcule sur les paires dont le retour a déjà été traité (bons clôturés).</p>
          <Tableau lignes={d.livreurs} colonnes={[
            { titre: "Livreur", valeur: (l) => l.livreur }, { titre: "Bons", valeur: (l) => `${l.nbBons}${l.nbEnCours ? ` (${l.nbEnCours} en cours)` : ""}` },
            { titre: "Paires emportées", valeur: (l) => l.pairesEmportees }, { titre: "Vendues", valeur: (l) => `${l.pairesVendues} (${virgule(l.tauxVente)})` },
            { titre: "Retournées", valeur: (l) => `${l.pairesRetournees} (${virgule(l.tauxRetour)})` }, { titre: "Perdues", valeur: (l) => l.pairesPerdues },
            { titre: "Ventes réalisées (F)", valeur: (l) => fmt(l.ca) }]} />
        </div>
      )}
    </div>
  );
}

// ── Gestion des listes ───────────────────────────────────────────────────────
function ListeLieux({ titre, type, lieux, onChange, setError, avecRecherche }) {
  const [nouveau, setNouveau] = useState("");
  const [filtre, setFiltre] = useState("");
  const ajouter = async () => {
    if (!nouveau.trim()) return;
    try {
      const l = await api.referentiels.ajouterLieu(type, nouveau.trim());
      if (l.existait) setError(`« ${l.nom} » est déjà dans la liste${l.actif ? "" : ""}.`);
      setNouveau(""); onChange();
    } catch (e) { setError(e.message); }
  };
  const bascule = async (l) => { try { await api.referentiels.modifierLieu(l.id, !l.actif); onChange(); } catch (e) { setError(e.message); } };
  const affiches = lieux.filter((l) => !filtre || cleNom(l.nom).includes(cleNom(filtre)));
  return (
    <div className="rounded-xl p-4" style={carte}>
      <p className="text-sm font-medium mb-2">{titre}</p>
      <div className="flex gap-2 mb-3">
        <input value={nouveau} onChange={(e) => setNouveau(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") ajouter(); }} placeholder="Ajouter…" style={{ ...selectStyle, flex: 1 }} />
        <button type="button" onClick={ajouter} className="px-3 rounded-lg text-xs font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Ajouter</button>
      </div>
      {avecRecherche && <input value={filtre} onChange={(e) => setFiltre(e.target.value)} placeholder="Chercher dans la liste…" style={{ ...selectStyle, width: "100%", marginBottom: 8 }} />}
      <div className="space-y-1" style={{ maxHeight: 320, overflowY: "auto" }}>
        {affiches.map((l) => (
          <div key={l.id} className="flex items-center justify-between text-sm py-1" style={{ borderTop: "1px solid #EFE7D9", opacity: l.actif ? 1 : 0.5 }}>
            <span>{l.nom}{!l.actif && " (masqué)"}</span>
            <button type="button" onClick={() => bascule(l)} className="text-xs" style={{ color: l.actif ? "#B04A3B" : "#3F6B4A" }}>{l.actif ? "Masquer" : "Réafficher"}</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function GestionLivreurs({ livreurs, onChange, setError }) {
  const [edition, setEdition] = useState(null); // { id, nom }
  const [fusion, setFusion] = useState({ source: "", cible: "" });
  const renommer = async () => {
    try { await api.referentiels.modifierLivreur(edition.id, { nom: edition.nom }); setEdition(null); onChange(); } catch (e) { setError(e.message); }
  };
  const bascule = async (l) => { try { await api.referentiels.modifierLivreur(l.id, { actif: !l.actif }); onChange(); } catch (e) { setError(e.message); } };
  const fusionner = async () => {
    const s = livreurs.find((l) => l.id === fusion.source), c = livreurs.find((l) => l.id === fusion.cible);
    if (!s || !c || s.id === c.id) { setError("Choisis deux livreurs différents."); return; }
    if (!window.confirm(`Regrouper « ${s.nom} » dans « ${c.nom} » ?\n\nTous les bons de « ${s.nom} » passeront sur « ${c.nom} », et « ${s.nom} » disparaîtra de la liste. Cette action est définitive.`)) return;
    try { const r = await api.referentiels.fusionnerLivreurs(s.id, c.id); setFusion({ source: "", cible: "" }); setError(`Fusion faite : ${r.fusionnes} bon(s) repris par ${c.nom}.`); onChange(); } catch (e) { setError(e.message); }
  };
  return (
    <div className="rounded-xl p-4" style={carte}>
      <p className="text-sm font-medium mb-1">Livreurs</p>
      <p className="text-xs mb-3" style={{ color: "#6B5D52" }}>Les caissières ajoutent elles-mêmes un livreur depuis la livraison. Ici : corriger un nom, masquer un livreur qui ne travaille plus, regrouper deux écritures de la même personne.</p>
      <div className="space-y-1 mb-4" style={{ maxHeight: 260, overflowY: "auto" }}>
        {livreurs.map((l) => (
          <div key={l.id} className="flex items-center justify-between gap-2 text-sm py-1" style={{ borderTop: "1px solid #EFE7D9", opacity: l.actif ? 1 : 0.5 }}>
            {edition?.id === l.id ? (
              <>
                <input value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} style={{ ...selectStyle, flex: 1 }} autoFocus />
                <button type="button" onClick={renommer} className="text-xs" style={{ color: "#3F6B4A" }}>Enregistrer</button>
                <button type="button" onClick={() => setEdition(null)} className="text-xs" style={{ color: "#6B5D52" }}>Annuler</button>
              </>
            ) : (
              <>
                <span>{l.nom}{!l.actif && " (masqué)"}</span>
                <span className="flex gap-3">
                  <button type="button" onClick={() => setEdition({ id: l.id, nom: l.nom })} className="text-xs" style={{ color: "#8C3B2E" }}>Renommer</button>
                  <button type="button" onClick={() => bascule(l)} className="text-xs" style={{ color: l.actif ? "#B04A3B" : "#3F6B4A" }}>{l.actif ? "Masquer" : "Réafficher"}</button>
                </span>
              </>
            )}
          </div>
        ))}
      </div>
      <p className="text-xs font-medium mb-2">Regrouper deux écritures de la même personne</p>
      <div className="flex flex-wrap gap-2 items-center">
        <select value={fusion.source} onChange={(e) => setFusion({ ...fusion, source: e.target.value })} style={selectStyle}><option value="">À regrouper…</option>{livreurs.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}</select>
        <span className="text-xs">dans</span>
        <select value={fusion.cible} onChange={(e) => setFusion({ ...fusion, cible: e.target.value })} style={selectStyle}><option value="">Nom à garder…</option>{livreurs.map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}</select>
        <button type="button" onClick={fusionner} className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Regrouper</button>
      </div>
    </div>
  );
}

function ClassementAnciennes({ setError }) {
  const [r, setR] = useState(null);
  const [encours, setEncours] = useState(false);
  const lancer = async (appliquer) => {
    if (appliquer && !window.confirm("Écrire la commune sur les anciennes livraisons reconnues ?\n\nLe texte d'origine n'est pas modifié, et seules les livraisons sans commune sont touchées.")) return;
    setEncours(true);
    try { setR(appliquer ? await api.referentiels.appliquerClassement() : await api.referentiels.simulerClassement()); } catch (e) { setError(e.message); } finally { setEncours(false); }
  };
  return (
    <div className="rounded-xl p-4 lg:col-span-2" style={carte}>
      <p className="text-sm font-medium mb-1">Classer les anciennes livraisons par commune</p>
      <p className="text-xs mb-3" style={{ color: "#6B5D52" }}>Les livraisons d'avant les communes n'en ont pas. Le logiciel peut en deviner beaucoup d'après le lieu déjà écrit (Angré, Riviera… = Cocody). « Voir ce qui serait fait » n'écrit rien.</p>
      <div className="flex gap-2 flex-wrap">
        <button type="button" disabled={encours} onClick={() => lancer(false)} className="px-3 py-2 rounded-lg text-xs font-medium" style={{ border: "1px solid #DDD3C4", color: "#8C3B2E" }}>Voir ce qui serait fait</button>
        {r && !r.appliquee && (r.reconnues + (r.expediees || 0)) > 0 && <button type="button" disabled={encours} onClick={() => lancer(true)} className="px-3 py-2 rounded-lg text-xs font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Appliquer ({r.reconnues + (r.expediees || 0)} livraisons)</button>}
      </div>
      {r && (
        <div className="mt-3 text-sm">
          <p>{r.appliquee ? "Fait : " : "Simulation : "}{r.sansCommune} livraisons sans commune — <b>{r.reconnues}</b> reconnues par commune, <b>{r.expediees || 0}</b> reconnues comme expéditions hors d'Abidjan, {r.ambigues} ambiguës, {r.nonReconnues} non reconnues.</p>
          {r.parCommune.length > 0 && <p className="text-xs mt-1" style={{ color: "#6B5D52" }}>{r.parCommune.map((c) => `${c.commune} ${c.nb}`).join(" · ")}</p>}
          {r.parDestination?.length > 0 && <p className="text-xs mt-1" style={{ color: "#6B5D52" }}>Expéditions : {r.parDestination.map((c) => `${c.lieu} ${c.nb}`).join(" · ")}</p>}
          {r.textesNonReconnus.length > 0 && !r.appliquee && (
            <details className="mt-2"><summary className="text-xs cursor-pointer" style={{ color: "#8C3B2E" }}>Textes non reconnus les plus fréquents</summary>
              <div className="text-xs mt-1" style={{ color: "#6B5D52" }}>{r.textesNonReconnus.map((t) => <div key={t.texte}>{t.nb} × {t.texte}</div>)}</div></details>
          )}
        </div>
      )}
    </div>
  );
}

export function Gestion() {
  const [lieux, setLieux] = useState({ communes: [], pays: [] });
  const [livreurs, setLivreurs] = useState([]);
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    try { const [l, v] = await Promise.all([api.referentiels.lieux(), api.referentiels.livreurs()]); setLieux(l); setLivreurs(v); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);
  return (
    <div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      <div className="grid lg:grid-cols-2 gap-4 items-start">
        <ListeLieux titre="Communes de livraison (Abidjan)" type="COMMUNE" lieux={lieux.communes} onChange={load} setError={setError} />
        <ListeLieux titre="Pays d'expédition (hors Côte d'Ivoire)" type="PAYS" lieux={lieux.pays} onChange={load} setError={setError} avecRecherche />
        <ClassementAnciennes setError={setError} />
        <div className="lg:col-span-2"><GestionLivreurs livreurs={livreurs} onChange={load} setError={setError} /></div>
      </div>
    </div>
  );
}

export default function LieuxEtLivreurs() {
  const [mode, setMode] = useState("stats");
  return (
    <div>
      <div className="flex gap-2 mb-4">
        {[["stats", "Statistiques"], ["gestion", "Gérer les listes"]].map(([id, label]) => (
          <button key={id} type="button" onClick={() => setMode(id)} className="px-4 py-2 rounded-lg text-sm font-medium"
            style={mode === id ? { background: "#2B2320", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>{label}</button>
        ))}
      </div>
      {mode === "stats" ? <Statistiques /> : <Gestion />}
    </div>
  );
}
