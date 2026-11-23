import { useState, useEffect } from "react";
import { api } from "../api.js";
import { BOUTIQUES, fmt } from "../constants.js";
import { ErrorBanner, selectStyle } from "../components/Shared.jsx";

// Lot 7 (I1) : valeur du stock au prix d'achat et au prix de vente, écart, marge. Administratrice seulement.
// Taux de marque (par rapport au prix de vente) en premier, choix de Djenie ; taux de marge (par rapport au prix d'achat) en option.
const jourIso = (d) => d.toISOString().slice(0, 10);
const carte = { background: "#FFFFFF", border: "1px solid #EAE1D2" };
const pct = (n) => (n == null ? "—" : `${String(n).replace(".", ",")} %`);

export function ValeurStock() {
  const [dateDebut, setDateDebut] = useState(jourIso(new Date(Date.now() - 30 * 86400000)));
  const [dateFin, setDateFin] = useState(jourIso(new Date()));
  const [boutique, setBoutique] = useState("");
  const [surAchat, setSurAchat] = useState(false);
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const valide = dateDebut && dateFin && dateDebut <= dateFin;
  useEffect(() => {
    if (!valide) return;
    setError("");
    api.valeurStock({ dateDebut, dateFin, boutique }).then(setD).catch((e) => setError(e.message));
  }, [dateDebut, dateFin, boutique, valide]);
  const taux = (o) => (surAchat ? o.tauxMarge : o.tauxMarque);
  const libelleTaux = surAchat ? "Taux de marge (sur prix d'achat)" : "Taux de marque (sur prix de vente)";
  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Ventes du</label><input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={selectStyle} /></div>
        <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>au</label><input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={selectStyle} /></div>
        <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Boutique</label>
          <select value={boutique} onChange={(e) => setBoutique(e.target.value)} style={selectStyle}><option value="">Les deux</option>{BOUTIQUES.map((b) => <option key={b}>{b}</option>)}</select></div>
        <button type="button" onClick={() => setSurAchat(!surAchat)} className="px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid #DDD3C4", color: "#6B5D52" }}>{surAchat ? "Afficher le taux de marque" : "Afficher le taux de marge (sur prix d'achat)"}</button>
      </div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      {d && (
        <div className="space-y-5">
          <div>
            <p className="text-sm font-medium mb-2">Stock actuel ({d.stock.paires} article{d.stock.paires > 1 ? "s" : ""} en stock)</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[["Valeur au prix d'achat", `${fmt(d.stock.valeurAchat)} F`], ["Valeur au prix de vente", `${fmt(d.stock.valeurVente)} F`], ["Écart (marge potentielle)", `${fmt(d.stock.ecart)} F`], [libelleTaux, pct(taux(d.stock))]].map(([t, v]) => (
                <div key={t} className="rounded-xl p-4" style={carte}><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>{t}</p><p className="font-display text-xl font-semibold">{v}</p></div>
              ))}
            </div>
            {d.stock.pairesSansPrixAchat > 0 && <p className="text-xs mt-2" style={{ color: "#8A6A22" }}>{d.stock.pairesSansPrixAchat} article(s) en stock n'ont pas de prix d'achat : ils sont comptés dans la valeur de vente seulement, et exclus de l'écart.</p>}
          </div>
          <div>
            <p className="text-sm font-medium mb-2">Marge réalisée sur les ventes du {new Date(dateDebut).toLocaleDateString("fr-FR")} au {new Date(dateFin).toLocaleDateString("fr-FR")}</p>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[["Ventes (avec prix d'achat connu)", `${fmt(d.ventesPeriode.caAvecPrixAchat)} F`], ["Coût d'achat", `${fmt(d.ventesPeriode.coutAchat)} F`], ["Marge", `${fmt(d.ventesPeriode.marge)} F`], [libelleTaux, pct(taux(d.ventesPeriode))]].map(([t, v]) => (
                <div key={t} className="rounded-xl p-4" style={carte}><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>{t}</p><p className="font-display text-xl font-semibold">{v}</p></div>
              ))}
            </div>
            {d.ventesPeriode.caSansPrixAchat > 0 && <p className="text-xs mt-2" style={{ color: "#8A6A22" }}>{fmt(d.ventesPeriode.caSansPrixAchat)} F de ventes concernent des articles sans prix d'achat : non comptés. Le prix d'achat est celui facturé par le fournisseur (sans transport ni douane) : la marge réelle est un peu plus basse.</p>}
          </div>
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">Par article</p>
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead><tr style={{ color: "#6B5D52" }}>{["Article", "Marque", "Stock", "Achat", "Vente", "Marge", libelleTaux].map((t, i) => <th key={t} className={`py-2 ${i < 2 ? "text-left" : "text-right"}`}>{t}</th>)}</tr></thead>
              <tbody>{d.articles.map((a) => (
                <tr key={a.id} style={{ borderTop: "1px solid #EFE7D9" }}>
                  <td className="py-2">{a.designation}</td><td>{a.marque}</td><td className="text-right">{a.quantite}</td>
                  <td className="text-right">{a.prixAchat != null ? `${fmt(a.prixAchat)} F${a.prixAchatEuro != null ? ` (${String(a.prixAchatEuro).replace(".", ",")} €)` : ""}` : "—"}</td>
                  <td className="text-right">{fmt(a.prixVente)} F</td><td className="text-right">{a.marge != null ? `${fmt(a.marge)} F` : "—"}</td><td className="text-right font-medium">{pct(surAchat ? a.tauxMarge : a.tauxMarque)}</td>
                </tr>
              ))}</tbody></table></div>
          </div>
        </div>
      )}
    </div>
  );
}
