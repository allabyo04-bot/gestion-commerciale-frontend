import { useState, useEffect } from "react";
import { Printer } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { BOUTIQUES, fmt } from "../constants.js";
import { ErrorBanner, selectStyle } from "../components/Shared.jsx";
import { imprimerRecuLivreur } from "../recuLivreur.js";

// Lot 10 : sommes versées aux livreurs sur une période, par boutique ou pour les deux (chaque paiement a son reçu).
const jourIso = (d) => d.toISOString().slice(0, 10);
const carte = { background: "#FFFFFF", border: "1px solid #EAE1D2" };

export function PaiementsLivreurs() {
  const { user } = useAuth();
  const estAdmin = !!user?.role?.systeme;
  const [dateDebut, setDateDebut] = useState(jourIso(new Date(Date.now() - 30 * 86400000)));
  const [dateFin, setDateFin] = useState(jourIso(new Date()));
  const [boutique, setBoutique] = useState("");
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const valide = dateDebut && dateFin && dateDebut <= dateFin;
  useEffect(() => {
    if (!valide) return;
    setError("");
    api.remisesLivreurs.etatPaiements({ dateDebut, dateFin, boutique }).then(setD).catch((e) => setError(e.message));
  }, [dateDebut, dateFin, boutique, valide]);
  const recu = async (id) => { try { imprimerRecuLivreur(await api.remisesLivreurs.recu(id)); } catch (e) { setError(e.message); } };
  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Paiements du</label><input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={selectStyle} /></div>
        <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>au</label><input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={selectStyle} /></div>
        {estAdmin && <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Boutique</label>
          <select value={boutique} onChange={(e) => setBoutique(e.target.value)} style={selectStyle}><option value="">Les deux</option>{BOUTIQUES.map((b) => <option key={b}>{b}</option>)}</select></div>}
      </div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      {d && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl p-4" style={carte}><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>Total versé aux livreurs</p><p className="font-display text-xl font-semibold">{fmt(d.total)} F</p></div>
            <div className="rounded-xl p-4" style={carte}><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>Nombre de paiements</p><p className="font-display text-xl font-semibold">{d.nb}</p></div>
            {d.parBoutique.map((b) => <div key={b.boutique} className="rounded-xl p-4" style={carte}><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>{b.boutique}</p><p className="font-display text-xl font-semibold">{fmt(b.total)} F</p></div>)}
          </div>
          {d.parLivreur.length > 0 && <div className="rounded-xl p-4" style={carte}><p className="text-sm font-medium mb-2">Par livreur</p>
            {d.parLivreur.map((l) => <div key={l.livreur} className="flex justify-between text-sm py-1"><span>{l.livreur}</span><strong>{fmt(l.total)} F</strong></div>)}</div>}
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">Détail des paiements</p>
            {!d.paiements.length && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucun paiement sur cette période.</p>}
            <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>
              {d.paiements.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #F1E9DC" }}>
                  <td className="py-2">{new Date(p.date).toLocaleDateString("fr-FR")}</td><td>{p.numero}</td><td>{p.livreurNom}</td><td>{p.boutique || "—"}</td><td>{p.payeParNom || "—"}</td>
                  <td className="text-right font-medium">{fmt(p.montant)} F</td>
                  <td className="text-right"><button type="button" onClick={() => recu(p.id)} title="Réimprimer le reçu" style={{ color: "#6B5D52" }}><Printer size={15} /></button></td>
                </tr>))}
            </tbody></table></div>
            <p className="text-xs mt-3" style={{ color: "#6B5D52" }}>Seuls les paiements faits depuis la mise en service des reçus apparaissent ici. Le coût des livreurs est déjà enregistré en dépenses dès que la remise est validée.</p>
          </div>
        </div>
      )}
    </div>
  );
}
