import { useState, useEffect } from "react";
import { api } from "../api.js";
import { BOUTIQUES, fmt } from "../constants.js";
import { ErrorBanner, selectStyle } from "../components/Shared.jsx";

// Lot 2 : états sur les clientes et la fidélité (administratrice).
const jourIso = (d) => d.toISOString().slice(0, 10);
const carte = { background: "#FFFFFF", border: "1px solid #EAE1D2" };
const dateFr = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "—");

function Tableau({ colonnes, lignes, vide }) {
  if (!lignes.length) return <p className="text-sm py-3" style={{ color: "#6B5D52" }}>{vide}</p>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead><tr style={{ color: "#6B5D52" }}>{colonnes.map((c) => <th key={c.titre} className="text-left font-medium py-2 pr-3">{c.titre}</th>)}</tr></thead>
        <tbody>{lignes.map((l, i) => <tr key={l.id || i} style={{ borderTop: "1px solid #EFE7D9" }}>{colonnes.map((c) => <td key={c.titre} className="py-2 pr-3">{c.valeur(l)}</td>)}</tr>)}</tbody>
      </table>
    </div>
  );
}

function Filtres({ dateDebut, setDateDebut, dateFin, setDateFin, boutique, setBoutique, sansDates }) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      {!sansDates && <>
        <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Du</label><input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={selectStyle} /></div>
        <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Au</label><input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={selectStyle} /></div>
      </>}
      <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Boutique</label>
        <select value={boutique} onChange={(e) => setBoutique(e.target.value)} style={selectStyle}><option value="">Les deux</option>{BOUTIQUES.map((b) => <option key={b}>{b}</option>)}</select></div>
    </div>
  );
}

function useEtat(appel, dateDebut, dateFin, boutique) {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const valide = !dateDebut || !dateFin || dateDebut <= dateFin;
  useEffect(() => {
    if (!valide) return;
    setError("");
    appel({ ...(dateDebut ? { dateDebut } : {}), ...(dateFin ? { dateFin } : {}), ...(boutique ? { boutique } : {}) }).then(setD).catch((e) => setError(e.message));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dateDebut, dateFin, boutique, valide]);
  return { d, error, setError, valide };
}

const Chiffre = ({ titre, valeur }) => (
  <div className="rounded-xl p-4" style={carte}><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>{titre}</p><p className="font-display text-2xl font-semibold">{valeur}</p></div>
);

// C1 — fiches à compléter, et fiches complétées (qui, quand).
export function FichesIncompletes() {
  const [dateDebut, setDateDebut] = useState(jourIso(new Date(Date.now() - 30 * 86400000)));
  const [dateFin, setDateFin] = useState(jourIso(new Date()));
  const [boutique, setBoutique] = useState("");
  const { d, error, setError, valide } = useEtat(api.etatsClientes.fichesIncompletes, dateDebut, dateFin, boutique);
  return (
    <div>
      <Filtres {...{ dateDebut, setDateDebut, dateFin, setDateFin, boutique, setBoutique }} />
      {!valide && <p className="text-xs mb-3" style={{ color: "#B04A3B" }}>Choisis deux dates, la première avant la seconde.</p>}
      <ErrorBanner error={error} onClose={() => setError("")} />
      {d && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3"><Chiffre titre="Fiches à compléter" valeur={d.aCompleter.length} /><Chiffre titre="Fiches complétées sur la période" valeur={d.completees.length} /></div>
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">À compléter</p>
            <Tableau vide="Toutes les fiches sont complètes." lignes={d.aCompleter} colonnes={[
              { titre: "Cliente", valeur: (l) => l.nomPrenoms }, { titre: "Téléphone", valeur: (l) => l.telephone || "—" },
              { titre: "Il manque", valeur: (l) => l.manques.join(", ") }, { titre: "Créée le", valeur: (l) => dateFr(l.creeLe) }, { titre: "Par", valeur: (l) => l.creePar || "—" }]} />
          </div>
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">Complétées</p>
            <Tableau vide="Aucune fiche complétée sur cette période." lignes={d.completees} colonnes={[
              { titre: "Cliente", valeur: (l) => l.nomPrenoms }, { titre: "Complétée le", valeur: (l) => dateFr(l.completeeLe) }, { titre: "Par", valeur: (l) => l.completeePar || "—" }]} />
          </div>
        </div>
      )}
    </div>
  );
}

// D2 — bonus à consommer / consommés, et leur coût.
export function EtatBonus() {
  const [dateDebut, setDateDebut] = useState(jourIso(new Date(Date.now() - 30 * 86400000)));
  const [dateFin, setDateFin] = useState(jourIso(new Date()));
  const [boutique, setBoutique] = useState("");
  const { d, error, setError, valide } = useEtat(api.etatsClientes.bonus, dateDebut, dateFin, boutique);
  return (
    <div>
      <Filtres {...{ dateDebut, setDateDebut, dateFin, setDateFin, boutique, setBoutique }} />
      {!valide && <p className="text-xs mb-3" style={{ color: "#B04A3B" }}>Choisis deux dates, la première avant la seconde.</p>}
      <ErrorBanner error={error} onClose={() => setError("")} />
      {d && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Chiffre titre="Bonus consommés (période)" valeur={d.consommes.nombre} /><Chiffre titre="Coût des bonus consommés" valeur={`${fmt(d.consommes.cout)} F`} />
            <Chiffre titre="Bonus à consommer" valeur={d.aConsommer.nombre} /><Chiffre titre="Coût si tous consommés" valeur={`${fmt(d.aConsommer.montant)} F`} />
          </div>
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">Par boutique</p>
            <Tableau vide="Aucun bonus." lignes={Object.entries(d.parBoutique).map(([b, v]) => ({ id: b, boutique: b, ...v }))} colonnes={[
              { titre: "Boutique", valeur: (l) => l.boutique }, { titre: "Consommés", valeur: (l) => l.consommes }, { titre: "Coût (F)", valeur: (l) => fmt(l.coutConsommes) },
              { titre: "À consommer", valeur: (l) => l.aConsommer }, { titre: "Montant (F)", valeur: (l) => fmt(l.montantAConsommer) }]} />
          </div>
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">À consommer — clientes concernées</p>
            <Tableau vide="Aucune cliente n'a de bonus disponible." lignes={d.aConsommer.lignes} colonnes={[
              { titre: "Cliente", valeur: (l) => l.nomPrenoms }, { titre: "Téléphone", valeur: (l) => l.telephone || "—" }, { titre: "Bonus (F)", valeur: (l) => fmt(l.montant) },
              { titre: "Dernier achat", valeur: (l) => `${dateFr(l.dernierAchat)}${l.boutique ? ` · ${l.boutique}` : ""}` }]} />
          </div>
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">Consommés sur la période</p>
            <Tableau vide="Aucun bonus consommé sur cette période." lignes={d.consommes.lignes} colonnes={[
              { titre: "Date", valeur: (l) => dateFr(l.createdAt) }, { titre: "Cliente", valeur: (l) => l.client.nomPrenoms }, { titre: "Vente", valeur: (l) => `${l.vente.numero} · ${l.vente.boutique}` }, { titre: "Montant (F)", valeur: (l) => fmt(l.montant) }]} />
          </div>
        </div>
      )}
    </div>
  );
}

// D3 — nouvelles clientes, par boutique.
export function NouvellesClientes() {
  const [dateDebut, setDateDebut] = useState(jourIso(new Date(Date.now() - 30 * 86400000)));
  const [dateFin, setDateFin] = useState(jourIso(new Date()));
  const [boutique, setBoutique] = useState("");
  const { d, error, setError, valide } = useEtat(api.etatsClientes.nouvellesClientes, dateDebut, dateFin, boutique);
  return (
    <div>
      <Filtres {...{ dateDebut, setDateDebut, dateFin, setDateFin, boutique, setBoutique }} />
      {!valide && <p className="text-xs mb-3" style={{ color: "#B04A3B" }}>Choisis deux dates, la première avant la seconde.</p>}
      <ErrorBanner error={error} onClose={() => setError("")} />
      {d && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Chiffre titre="Nouvelles clientes" valeur={d.total} />
            {Object.entries(d.parBoutique).map(([b, n]) => <Chiffre key={b} titre={b} valeur={n} />)}
          </div>
          <div className="rounded-xl p-4" style={carte}>
            <Tableau vide="Aucune nouvelle cliente sur cette période." lignes={d.lignes} colonnes={[
              { titre: "Créée le", valeur: (l) => dateFr(l.creeLe) }, { titre: "Cliente", valeur: (l) => l.nomPrenoms }, { titre: "Téléphone", valeur: (l) => l.telephone || "—" }, { titre: "Boutique", valeur: (l) => l.boutique }]} />
          </div>
        </div>
      )}
    </div>
  );
}
