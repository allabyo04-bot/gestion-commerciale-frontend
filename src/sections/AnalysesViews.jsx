import { useState, useEffect } from "react";
import { api } from "../api.js";
import { BOUTIQUES, fmt } from "../constants.js";
import { ErrorBanner, selectStyle } from "../components/Shared.jsx";

// Lot 3 : analyses de ventes et de stock (administratrice). Paires de chaussures, retours déduits.
const carte = { background: "#FFFFFF", border: "1px solid #EAE1D2" };
const aujourdhui = () => new Date().toISOString().slice(0, 10);
const ilYAUnAn = () => new Date(Date.now() - 365 * 86400000).toISOString().slice(0, 10);
const moisLisible = (m) => { const [a, n] = m.split("-"); return `${["janv.", "févr.", "mars", "avr.", "mai", "juin", "juil.", "août", "sept.", "oct.", "nov.", "déc."][Number(n) - 1]} ${a}`; };

function Tableau({ colonnes, lignes, vide }) {
  if (!lignes.length) return <p className="text-sm py-3" style={{ color: "#6B5D52" }}>{vide}</p>;
  return (
    <div className="overflow-x-auto"><table className="w-full text-sm">
      <thead><tr style={{ color: "#6B5D52" }}>{colonnes.map((c) => <th key={c.titre} className="text-left font-medium py-2 pr-3">{c.titre}</th>)}</tr></thead>
      <tbody>{lignes.map((l, i) => <tr key={l.id || l.marque || l.mois || i} style={{ borderTop: "1px solid #EFE7D9" }}>{colonnes.map((c) => <td key={c.titre} className="py-2 pr-3">{c.valeur(l)}</td>)}</tr>)}</tbody>
    </table></div>
  );
}

function Filtres({ f, set, avecRecherche }) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Du</label><input type="date" value={f.dateDebut} onChange={(e) => set({ ...f, dateDebut: e.target.value })} style={selectStyle} /></div>
      <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Au</label><input type="date" value={f.dateFin} onChange={(e) => set({ ...f, dateFin: e.target.value })} style={selectStyle} /></div>
      <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Boutique</label>
        <select value={f.boutique} onChange={(e) => set({ ...f, boutique: e.target.value })} style={selectStyle}><option value="">Les deux</option>{BOUTIQUES.map((b) => <option key={b}>{b}</option>)}</select></div>
      {avecRecherche && <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Chercher une cliente</label><input value={f.q} onChange={(e) => set({ ...f, q: e.target.value })} placeholder="Nom ou téléphone" style={selectStyle} /></div>}
    </div>
  );
}

function useAnalyse(appel, f) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const valide = !f.dateDebut || !f.dateFin || f.dateDebut <= f.dateFin;
  useEffect(() => {
    if (!valide) return undefined;
    setError("");
    const t = setTimeout(() => {
      appel(Object.fromEntries(Object.entries(f).filter(([, v]) => v))).then(setD).catch((e) => setError(e.message));
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [f.dateDebut, f.dateFin, f.boutique, f.q, valide]);
  return { d, error, setError, valide };
}
const Note = ({ children }) => <p className="text-xs mt-3" style={{ color: "#6B5D52" }}>{children}</p>;
const Chiffre = ({ titre, valeur }) => <div className="rounded-xl p-4" style={carte}><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>{titre}</p><p className="font-display text-2xl font-semibold">{valeur}</p></div>;
const liste = (a) => a.map((x) => `T${x.pointure} (${x.paires})`).join(", ");

// F4 — pointures les plus et les moins vendues, par marque.
export function PointuresParMarque() {
  const [f, setF] = useState({ dateDebut: ilYAUnAn(), dateFin: aujourdhui(), boutique: "", q: "" });
  const { d, error, setError, valide } = useAnalyse(api.analyses.pointuresParMarque, f);
  return (
    <div>
      <Filtres f={f} set={setF} />
      {!valide && <p className="text-xs mb-3" style={{ color: "#B04A3B" }}>Choisis deux dates, la première avant la seconde.</p>}
      <ErrorBanner error={error} onClose={() => setError("")} />
      {d && (
        <div className="space-y-4">
          <Chiffre titre="Paires vendues sur la période" valeur={d.totalPaires} />
          <div className="rounded-xl p-4" style={carte}>
            <Tableau vide="Aucune vente de chaussures sur cette période." lignes={d.marques} colonnes={[
              { titre: "Marque", valeur: (m) => m.marque }, { titre: "Paires", valeur: (m) => m.paires },
              { titre: "Pointures les plus vendues", valeur: (m) => liste(m.plusVendues) },
              { titre: "Pointures les moins vendues", valeur: (m) => (m.detail.length > 1 ? liste(m.moinsVendues) : "—") }]} />
            <Note>Seules les pointures déjà vendues sont comptées. Entre parenthèses : le nombre de paires. Les retours sont déduits.</Note>
          </div>
          {d.marques.map((m) => (
            <details key={m.marque} className="rounded-xl p-4" style={carte}>
              <summary className="text-sm font-medium cursor-pointer">{m.marque} — détail par pointure</summary>
              <div className="flex flex-wrap gap-2 mt-3">{m.detail.map((x) => <span key={x.pointure} className="px-2 py-1 rounded-lg text-xs" style={{ background: "#F1E9DC" }}>T{x.pointure} · {x.paires}</span>)}</div>
            </details>
          ))}
        </div>
      )}
    </div>
  );
}

// F3 — mois de meilleures ventes.
export function MeilleursMois() {
  const [f, setF] = useState({ dateDebut: ilYAUnAn(), dateFin: aujourdhui(), boutique: "", q: "" });
  const { d, error, setError, valide } = useAnalyse(api.analyses.meilleursMois, f);
  return (
    <div>
      <Filtres f={f} set={setF} />
      {!valide && <p className="text-xs mb-3" style={{ color: "#B04A3B" }}>Choisis deux dates, la première avant la seconde.</p>}
      <ErrorBanner error={error} onClose={() => setError("")} />
      {d && (
        <div className="space-y-4">
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">Les 5 meilleurs mois</p>
            <Tableau vide="Aucune vente sur cette période." lignes={d.classement} colonnes={[{ titre: "Mois", valeur: (m) => moisLisible(m.mois) }, { titre: "Paires", valeur: (m) => m.paires }, { titre: "Ventes (F)", valeur: (m) => fmt(m.ca) }]} />
          </div>
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">Mois par mois</p>
            <Tableau vide="Aucune vente." lignes={d.chrono} colonnes={[{ titre: "Mois", valeur: (m) => moisLisible(m.mois) }, { titre: "Paires", valeur: (m) => m.paires }, { titre: "Ventes (F)", valeur: (m) => fmt(m.ca) }]} />
          </div>
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">Par mois de l'année (toutes années confondues sur la période)</p>
            <Tableau vide="Aucune vente." lignes={d.saisonnalite} colonnes={[{ titre: "Mois", valeur: (m) => m.mois }, { titre: "Paires", valeur: (m) => m.paires }, { titre: "Ventes (F)", valeur: (m) => fmt(m.ca) }]} />
          </div>
        </div>
      )}
    </div>
  );
}

// G1 (simple) — nombre de clientes par boutique et habitudes d'achat.
export function HabitudesClientes() {
  const [f, setF] = useState({ dateDebut: "", dateFin: "", boutique: "", q: "" });
  const { d, error, setError, valide } = useAnalyse(api.analyses.habitudesClientes, f);
  return (
    <div>
      <Filtres f={f} set={setF} avecRecherche />
      {!valide && <p className="text-xs mb-3" style={{ color: "#B04A3B" }}>Choisis deux dates, la première avant la seconde.</p>}
      <ErrorBanner error={error} onClose={() => setError("")} />
      {d && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3"><Chiffre titre="Clientes ayant acheté" valeur={d.nbClientes} />{Object.entries(d.parBoutique).map(([b, n]) => <Chiffre key={b} titre={b} valeur={n} />)}</div>
          <div className="rounded-xl p-4" style={carte}>
            <Tableau vide="Aucune cliente identifiée sur cette période." lignes={d.clientes} colonnes={[
              { titre: "Cliente", valeur: (c) => c.nomPrenoms }, { titre: "Paires", valeur: (c) => c.paires },
              { titre: "Marques préférées", valeur: (c) => c.marques.map((m) => `${m.nom} (${m.paires})`).join(", ") },
              { titre: "Pointures", valeur: (c) => c.pointures.map((p) => `T${p.nom}`).join(", ") }, { titre: "Boutique", valeur: (c) => c.boutiques.join(", ") }]} />
            <Note>Les 200 clientes qui ont le plus acheté. Le détail par modèle, couleur ou talon viendra avec la fiche article enrichie.</Note>
          </div>
        </div>
      )}
    </div>
  );
}
