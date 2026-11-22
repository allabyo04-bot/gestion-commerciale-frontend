import { useState, useEffect, useCallback, useMemo } from "react";
import { api } from "../api.js";
import { Field, inputStyle, selectStyle } from "../components/Shared.jsx";

// Lot 5 (F2) : fiche article enrichie. Les caractéristiques (couleur, matière, hauteur du talon...) sont créées par
// l'administratrice ; les filtres du stock sont construits à partir de ces listes.
const FAMILLES_CARAC = ["Chaussure", "Sac", "Article d'entretien"];

// Charge les caractéristiques et leurs valeurs par article ; ne fait rien tant que le lot est éteint.
export function useCaracteristiques(actif) {
  const [defs, setDefs] = useState([]);
  const [lignes, setLignes] = useState([]);
  const recharger = useCallback(async () => {
    if (!actif) return;
    try {
      const [d, l] = await Promise.all([api.caracteristiques.list(), api.caracteristiques.articles()]);
      setDefs(d); setLignes(l);
    } catch { /* l'écran Stock reste utilisable sans ces informations */ }
  }, [actif]);
  useEffect(() => { recharger(); }, [recharger]);
  const liens = useMemo(() => {
    const m = new Map();
    for (const l of lignes) { if (!m.has(l.articleId)) m.set(l.articleId, {}); m.get(l.articleId)[l.caracteristiqueId] = l.valeurId; }
    return m;
  }, [lignes]);
  return { actif, defs, liens, recharger };
}

const concerne = (def, famille) => def.actif && (!def.famille || !famille || famille === "Tous" || def.famille === famille);

// Un menu déroulant par caractéristique ; une caractéristique créée demain apparaît ici sans rien changer.
export function FiltresCaracteristiques({ carac, famille, filtres, setFiltres }) {
  if (!carac.actif) return null;
  const visibles = carac.defs.filter((d) => concerne(d, famille) && d.valeurs.some((v) => v.actif));
  if (!visibles.length) return null;
  const nb = Object.values(filtres).filter(Boolean).length;
  return (
    <div className="flex gap-2 flex-wrap items-center mb-4">
      {visibles.map((d) => (
        <select key={d.id} value={filtres[d.id] || ""} onChange={(e) => setFiltres({ ...filtres, [d.id]: e.target.value })} style={selectStyle}>
          <option value="">{d.nom} : toutes</option>
          {d.valeurs.filter((v) => v.actif).map((v) => <option key={v.id} value={v.id}>{v.valeur}</option>)}
        </select>
      ))}
      {nb > 0 && <button onClick={() => setFiltres({})} className="text-xs" style={{ color: "#6B5D52" }}>Effacer les filtres ({nb})</button>}
    </div>
  );
}

// Vrai si l'article répond à tous les filtres choisis.
export function correspondAuxFiltres(carac, articleId, filtres) {
  const choisis = Object.entries(filtres).filter(([, v]) => v);
  if (!choisis.length) return true;
  const siens = carac.liens.get(articleId) || {};
  return choisis.every(([cid, vid]) => siens[cid] === vid);
}

export function BadgesCaracteristiques({ carac, article }) {
  if (!carac.actif) return null;
  const siens = carac.liens.get(article.id) || {};
  const items = carac.defs.map((d) => [d, d.valeurs.find((v) => v.id === siens[d.id])]).filter(([, v]) => v);
  if (!items.length) return null;
  return (
    <div className="flex gap-1.5 flex-wrap mt-2">
      {items.map(([d, v]) => (
        <span key={d.id} className="text-[11px] px-2 py-0.5 rounded-full" style={{ background: "#FBF3EC", color: "#6B5D52", border: "1px solid #EAE1D2" }} title={d.nom}>{d.nom} : {v.valeur}</span>
      ))}
    </div>
  );
}

// Champs de la fiche article (fenêtre « Nouvel article » / « Modifier »).
export function ChampsCaracteristiques({ carac, famille, valeurs, onChange, onError }) {
  const [ajout, setAjout] = useState(null); // { defId, texte }
  if (!carac.actif) return null;
  const defs = carac.defs.filter((d) => concerne(d, famille));
  if (!defs.length) return null;
  const creer = async () => {
    if (!ajout?.texte.trim()) return;
    try {
      const v = await api.caracteristiques.ajouterValeur(ajout.defId, ajout.texte.trim());
      await carac.recharger();
      onChange({ ...valeurs, [ajout.defId]: v.id });
      setAjout(null);
    } catch (e) { onError(e.message); }
  };
  return (
    <div className="mt-4 pt-4" style={{ borderTop: "1px solid #EFE7D9" }}>
      <p className="text-xs font-mono uppercase tracking-wide mb-3" style={{ color: "#8C3B2E" }}>Caractéristiques</p>
      <div className="grid grid-cols-2 gap-x-3">
        {defs.map((d) => (
          <Field key={d.id} label={d.nom}>
            {ajout?.defId === d.id ? (
              <div className="flex gap-1">
                <input autoFocus value={ajout.texte} onChange={(e) => setAjout({ ...ajout, texte: e.target.value })} onKeyDown={(e) => e.key === "Enter" && creer()} placeholder="Nouvelle valeur" style={inputStyle} />
                <button onClick={creer} className="px-2 rounded-lg text-xs" style={{ background: "#3F6B4A", color: "#F3F7F3" }}>OK</button>
                <button onClick={() => setAjout(null)} className="px-1 text-xs" style={{ color: "#6B5D52" }}>✕</button>
              </div>
            ) : (
              <select value={valeurs[d.id] || ""} onChange={(e) => e.target.value === "__nouvelle__" ? setAjout({ defId: d.id, texte: "" }) : onChange({ ...valeurs, [d.id]: e.target.value })} style={inputStyle}>
                <option value="">—</option>
                {d.valeurs.filter((v) => v.actif || v.id === valeurs[d.id]).map((v) => <option key={v.id} value={v.id}>{v.valeur}</option>)}
                <option value="__nouvelle__">➕ Nouvelle valeur…</option>
              </select>
            )}
          </Field>
        ))}
      </div>
    </div>
  );
}

// Onglet « Caractéristiques » (administratrice) : créer, masquer, supprimer des caractéristiques et leurs valeurs.
export function GestionCaracteristiques({ carac, onError }) {
  const [nom, setNom] = useState("");
  const [famille, setFamille] = useState("");
  const [nouvelles, setNouvelles] = useState({});
  const agir = async (f) => { try { await f(); await carac.recharger(); } catch (e) { onError(e.message); } };
  const ajouter = () => nom.trim() && agir(async () => { await api.caracteristiques.creer({ nom: nom.trim(), famille: famille || null }); setNom(""); });

  return (
    <div>
      <p className="text-xs mb-4" style={{ color: "#6B5D52" }}>
        Chaque caractéristique ci-dessous devient automatiquement un filtre dans « Articles » et un champ de la fiche article. Une valeur déjà utilisée par des articles ne peut être que masquée.
      </p>
      <div className="flex items-center gap-2 mb-6 flex-wrap">
        <input value={nom} onChange={(e) => setNom(e.target.value)} onKeyDown={(e) => e.key === "Enter" && ajouter()} placeholder="Nouvelle caractéristique (ex. Semelle)" className="flex-1 min-w-48 px-3 py-2 rounded-lg text-sm outline-none" style={{ border: "1px solid #DDD3C4", background: "#FFFFFF" }} />
        <select value={famille} onChange={(e) => setFamille(e.target.value)} style={selectStyle}>
          <option value="">Pour tous les articles</option>
          {FAMILLES_CARAC.map((f) => <option key={f} value={f}>{f} seulement</option>)}
        </select>
        <button onClick={ajouter} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Ajouter</button>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {carac.defs.map((d) => (
          <div key={d.id} className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2", opacity: d.actif ? 1 : 0.55 }}>
            <div className="flex items-center justify-between mb-2">
              <p className="font-medium text-sm">{d.nom} <span className="text-xs font-normal" style={{ color: "#6B5D52" }}>· {d.famille || "tous les articles"}</span></p>
              <span className="flex gap-3 text-xs">
                <button className="underline" onClick={() => agir(() => api.caracteristiques.modifier(d.id, { actif: !d.actif }))}>{d.actif ? "Masquer" : "Réactiver"}</button>
                <button className="underline" style={{ color: "#B04A3B" }} onClick={() => window.confirm(`Supprimer la caractéristique « ${d.nom} » et ses valeurs ?`) && agir(() => api.caracteristiques.supprimer(d.id))}>Supprimer</button>
              </span>
            </div>
            <div className="flex gap-1.5 flex-wrap mb-3">
              {d.valeurs.map((v) => (
                <span key={v.id} className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1.5" style={{ background: v.actif ? "#F1E9DC" : "#EEE8DE", color: v.actif ? "#2B2320" : "#A89B8C", textDecoration: v.actif ? "none" : "line-through" }}>
                  {v.valeur}{v.nbArticles > 0 && <span style={{ color: "#6B5D52" }}>({v.nbArticles})</span>}
                  <button title={v.actif ? "Masquer" : "Réactiver"} onClick={() => agir(() => api.caracteristiques.modifierValeur(v.id, { actif: !v.actif }))}>{v.actif ? "◐" : "↺"}</button>
                  {v.nbArticles === 0 && <button title="Supprimer" style={{ color: "#B04A3B" }} onClick={() => agir(() => api.caracteristiques.supprimerValeur(v.id))}>✕</button>}
                </span>
              ))}
              {d.valeurs.length === 0 && <span className="text-xs" style={{ color: "#6B5D52" }}>Aucune valeur pour l'instant.</span>}
            </div>
            <div className="flex gap-1.5">
              <input value={nouvelles[d.id] || ""} onChange={(e) => setNouvelles({ ...nouvelles, [d.id]: e.target.value })} placeholder="Nouvelle valeur"
                onKeyDown={(e) => e.key === "Enter" && (nouvelles[d.id] || "").trim() && agir(async () => { await api.caracteristiques.ajouterValeur(d.id, nouvelles[d.id]); setNouvelles({ ...nouvelles, [d.id]: "" }); })}
                className="flex-1 px-2 py-1 rounded text-xs outline-none" style={{ border: "1px solid #DDD3C4" }} />
              <button onClick={() => (nouvelles[d.id] || "").trim() && agir(async () => { await api.caracteristiques.ajouterValeur(d.id, nouvelles[d.id]); setNouvelles({ ...nouvelles, [d.id]: "" }); })} className="text-xs px-2 py-1 rounded" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>+</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
