import { useState, useEffect, useCallback } from "react";
import { Gift, Crown, Plus, Trash2, Pencil } from "lucide-react";
import { api } from "../api.js";
import { fmt } from "../constants.js";
import { ErrorBanner } from "../components/Shared.jsx";

const inputStyle = { border: "1px solid #DDD3C4", borderRadius: 8, padding: "8px 10px", fontSize: 14 };

function Onglets({ vue, setVue }) {
  const items = [["BONUS", "Paliers de bonus", Gift], ["STATUT", "Paliers de statut", Crown]];
  return (
    <div className="flex gap-2 mb-5">
      {items.map(([id, label, Icon]) => (
        <button key={id} type="button" onClick={() => setVue(id)}
          className="px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5"
          style={vue === id ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  );
}

function PaliersBonus() {
  const [paliers, setPaliers] = useState(null);
  const [error, setError] = useState("");
  const [edition, setEdition] = useState(null); // { id?, seuilBas, seuilHaut, montantBonus }

  const load = useCallback(async () => {
    try { setPaliers(await api.fidelite.paliersBonus()); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const enregistrer = async () => {
    try {
      const data = { seuilBas: Number(edition.seuilBas), seuilHaut: edition.seuilHaut === "" ? null : Number(edition.seuilHaut), montantBonus: Number(edition.montantBonus) };
      if (edition.id) await api.fidelite.majPalierBonus(edition.id, data);
      else await api.fidelite.creerPalierBonus(data);
      setEdition(null);
      load();
    } catch (e) { setError(e.message); }
  };
  const supprimer = async (id) => {
    try { await api.fidelite.supprimerPalierBonus(id); load(); } catch (e) { setError(e.message); }
  };
  const toggleActif = async (p) => {
    try { await api.fidelite.majPalierBonus(p.id, { actif: !p.actif }); load(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: "#6B5D52" }}>
        Basé sur le cumul <strong>courant</strong> d'une cliente (celui qui repart à zéro dès qu'un bonus est utilisé). Un seuil haut vide veut dire "et au-delà".
      </p>
      {error && <ErrorBanner error={error} />}
      {paliers === null ? (
        <p className="text-sm" style={{ color: "#6B5D52" }}>Chargement...</p>
      ) : (
        <div className="space-y-2 mb-4">
          {paliers.map((p) => (
            <div key={p.id} className="rounded-xl p-3 flex items-center justify-between gap-3 text-sm" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2", opacity: p.actif ? 1 : 0.5 }}>
              <div>
                De {fmt(p.seuilBas)} F {p.seuilHaut != null ? `à ${fmt(p.seuilHaut)} F` : "et au-delà"}
                <span className="ml-2 font-semibold" style={{ color: "#8C3B2E" }}>→ {fmt(p.montantBonus)} F</span>
                {!p.actif && <span className="ml-2 text-xs" style={{ color: "#6B5D52" }}>(désactivé)</span>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => toggleActif(p)} className="text-xs px-2 py-1 rounded" style={{ border: "1px solid #DDD3C4" }}>{p.actif ? "Désactiver" : "Activer"}</button>
                <button onClick={() => setEdition({ id: p.id, seuilBas: p.seuilBas, seuilHaut: p.seuilHaut ?? "", montantBonus: p.montantBonus })} className="p-1.5 rounded" style={{ border: "1px solid #DDD3C4" }}><Pencil size={14} /></button>
                <button onClick={() => supprimer(p.id)} className="p-1.5 rounded" style={{ border: "1px solid #DDD3C4", color: "#B04A3B" }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {edition ? (
        <div className="rounded-xl p-4 flex flex-wrap items-end gap-3" style={{ background: "#FFFDF9", border: "1px solid #EAE1D2" }}>
          <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Seuil bas (F)</label><input type="number" value={edition.seuilBas} onChange={(e) => setEdition({ ...edition, seuilBas: e.target.value })} style={inputStyle} className="w-32" /></div>
          <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Seuil haut (F, vide = illimité)</label><input type="number" value={edition.seuilHaut} onChange={(e) => setEdition({ ...edition, seuilHaut: e.target.value })} style={inputStyle} className="w-40" /></div>
          <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Montant du bonus (F)</label><input type="number" value={edition.montantBonus} onChange={(e) => setEdition({ ...edition, montantBonus: e.target.value })} style={inputStyle} className="w-32" /></div>
          <button onClick={enregistrer} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Enregistrer</button>
          <button onClick={() => setEdition(null)} className="px-4 py-2 rounded-lg text-sm" style={{ border: "1px solid #DDD3C4" }}>Annuler</button>
        </div>
      ) : (
        <button onClick={() => setEdition({ seuilBas: "", seuilHaut: "", montantBonus: "" })} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#8C3B2E" }}>
          <Plus size={16} /> Ajouter un palier de bonus
        </button>
      )}
    </div>
  );
}

function PaliersStatut() {
  const [paliers, setPaliers] = useState(null);
  const [error, setError] = useState("");
  const [edition, setEdition] = useState(null); // { id?, nom, seuilBas, seuilHaut }

  const load = useCallback(async () => {
    try { setPaliers(await api.fidelite.paliersStatut()); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const enregistrer = async () => {
    try {
      const data = { nom: edition.nom, seuilBas: Number(edition.seuilBas), seuilHaut: edition.seuilHaut === "" ? null : Number(edition.seuilHaut) };
      if (edition.id) await api.fidelite.majPalierStatut(edition.id, data);
      else await api.fidelite.creerPalierStatut(data);
      setEdition(null);
      load();
    } catch (e) { setError(e.message); }
  };
  const supprimer = async (id) => {
    try { await api.fidelite.supprimerPalierStatut(id); load(); } catch (e) { setError(e.message); }
  };
  const toggleActif = async (p) => {
    try { await api.fidelite.majPalierStatut(p.id, { actif: !p.actif }); load(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: "#6B5D52" }}>
        Basé sur le cumul <strong>total à vie</strong> d'une cliente (jamais remis à zéro). Purement honorifique — aucune réduction automatique associée.
      </p>
      {error && <ErrorBanner error={error} />}
      {paliers === null ? (
        <p className="text-sm" style={{ color: "#6B5D52" }}>Chargement...</p>
      ) : (
        <div className="space-y-2 mb-4">
          {paliers.map((p) => (
            <div key={p.id} className="rounded-xl p-3 flex items-center justify-between gap-3 text-sm" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2", opacity: p.actif ? 1 : 0.5 }}>
              <div>
                <span className="font-semibold">{p.nom}</span>
                <span className="ml-2" style={{ color: "#6B5D52" }}>
                  De {fmt(p.seuilBas)} F {p.seuilHaut != null ? `à ${fmt(p.seuilHaut)} F` : "et au-delà"}
                </span>
                {!p.actif && <span className="ml-2 text-xs" style={{ color: "#6B5D52" }}>(désactivé)</span>}
              </div>
              <div className="flex gap-2 shrink-0">
                <button onClick={() => toggleActif(p)} className="text-xs px-2 py-1 rounded" style={{ border: "1px solid #DDD3C4" }}>{p.actif ? "Désactiver" : "Activer"}</button>
                <button onClick={() => setEdition({ id: p.id, nom: p.nom, seuilBas: p.seuilBas, seuilHaut: p.seuilHaut ?? "" })} className="p-1.5 rounded" style={{ border: "1px solid #DDD3C4" }}><Pencil size={14} /></button>
                <button onClick={() => supprimer(p.id)} className="p-1.5 rounded" style={{ border: "1px solid #DDD3C4", color: "#B04A3B" }}><Trash2 size={14} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {edition ? (
        <div className="rounded-xl p-4 flex flex-wrap items-end gap-3" style={{ background: "#FFFDF9", border: "1px solid #EAE1D2" }}>
          <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Nom</label><input type="text" value={edition.nom} onChange={(e) => setEdition({ ...edition, nom: e.target.value })} style={inputStyle} className="w-48" placeholder="Cendrillon ..." /></div>
          <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Seuil bas (F)</label><input type="number" value={edition.seuilBas} onChange={(e) => setEdition({ ...edition, seuilBas: e.target.value })} style={inputStyle} className="w-32" /></div>
          <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Seuil haut (F, vide = illimité)</label><input type="number" value={edition.seuilHaut} onChange={(e) => setEdition({ ...edition, seuilHaut: e.target.value })} style={inputStyle} className="w-40" /></div>
          <button onClick={enregistrer} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Enregistrer</button>
          <button onClick={() => setEdition(null)} className="px-4 py-2 rounded-lg text-sm" style={{ border: "1px solid #DDD3C4" }}>Annuler</button>
        </div>
      ) : (
        <button onClick={() => setEdition({ nom: "", seuilBas: "", seuilHaut: "" })} className="flex items-center gap-1.5 text-sm font-medium" style={{ color: "#8C3B2E" }}>
          <Plus size={16} /> Ajouter un statut
        </button>
      )}
    </div>
  );
}

export default function FideliteSection() {
  const [vue, setVue] = useState("BONUS");
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">Programme de fidélité — Cendrillon</h1>
      <p className="text-sm mb-5" style={{ color: "#6B5D52" }}>Réservé à l'administrateur — les deux grilles ci-dessous sont entièrement à ta main.</p>
      <Onglets vue={vue} setVue={setVue} />
      {vue === "BONUS" && <PaliersBonus />}
      {vue === "STATUT" && <PaliersStatut />}
    </div>
  );
}
