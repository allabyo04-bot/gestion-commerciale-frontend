import { useState, useEffect } from "react";
import { Printer, Download } from "lucide-react";
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
  const esc = (x) => String(x ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const titreEtat = () => `${boutique || "Toutes les boutiques"} — du ${new Date(`${dateDebut}T12:00:00`).toLocaleDateString("fr-FR")} au ${new Date(`${dateFin}T12:00:00`).toLocaleDateString("fr-FR")}`;
  const exporter = () => {
    const l = [["Date", "N° reçu", "Livreur", "Boutique", "Moyen", "Payé par", "Montant (F)"]];
    d.paiements.forEach((p) => l.push([new Date(p.date).toLocaleDateString("fr-FR"), p.numero, p.livreurNom, p.boutique || "", p.mode, p.payeParNom || "", p.montant]));
    l.push([], ["Total", "", "", "", "", "", d.total]);
    const csv = l.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
    a.download = `paiements-livreurs-${dateDebut}-${dateFin}${boutique ? `-${boutique}` : ""}.csv`;
    a.click(); URL.revokeObjectURL(a.href);
  };
  const imprimer = () => {
    const w = window.open("", "_blank");
    if (!w) { setError("Le navigateur a bloqué la fenêtre : autorise les fenêtres pour ce site."); return; }
    const bloc = (titre, lignes) => lignes?.length ? `<h2>${titre}</h2><table>${lignes.map(([a, b]) => `<tr><td>${esc(a)}</td><td class="r">${fmt(b)} F</td></tr>`).join("")}</table>` : "";
    w.document.write(`<html><head><title>Paiements aux livreurs</title><style>
      body{font-family:Arial,sans-serif;font-size:12px;margin:24px;color:#000}h1{font-size:17px;margin:0 0 4px}h2{font-size:13px;margin:16px 0 4px}
      table{width:100%;border-collapse:collapse}td,th{padding:4px 6px;border-bottom:1px solid #ccc;text-align:left}.r{text-align:right}.tot{font-weight:bold;font-size:14px;margin:10px 0}
    </style></head><body>
      <h1>La Pointure Espagnole — Sommes versées aux livreurs</h1><p>${esc(titreEtat())}</p>
      <p class="tot">Total versé : ${fmt(d.total)} F (${d.nb} paiement${d.nb > 1 ? "s" : ""})</p>
      ${bloc("Par boutique", d.parBoutique.map((x) => [x.boutique, x.total]))}${bloc("Par moyen de paiement", d.parMode.map((x) => [x.mode, x.total]))}${bloc("Par livreur", d.parLivreur.map((x) => [x.livreur, x.total]))}
      <h2>Détail</h2><table><tr><th>Date</th><th>N°</th><th>Livreur</th><th>Boutique</th><th>Moyen</th><th class="r">Montant</th></tr>
      ${d.paiements.map((p) => `<tr><td>${new Date(p.date).toLocaleDateString("fr-FR")}</td><td>${esc(p.numero)}</td><td>${esc(p.livreurNom)}</td><td>${esc(p.boutique || "—")}</td><td>${esc(p.mode)}</td><td class="r">${fmt(p.montant)} F</td></tr>`).join("")}</table>
      <script>window.onload=function(){window.print()}</script></body></html>`);
    w.document.close();
  };
  return (
    <div>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Paiements du</label><input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)} style={selectStyle} /></div>
        <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>au</label><input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)} style={selectStyle} /></div>
        {estAdmin && <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Boutique</label>
          <select value={boutique} onChange={(e) => setBoutique(e.target.value)} style={selectStyle}><option value="">Les deux</option>{BOUTIQUES.map((b) => <option key={b}>{b}</option>)}</select></div>}
        {d && <div className="flex gap-2">
          <button type="button" onClick={imprimer} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid #EAE1D2", color: "#6B5D52" }}><Printer size={14} /> Imprimer</button>
          <button type="button" onClick={exporter} className="flex items-center gap-1 px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid #EAE1D2", color: "#6B5D52" }}><Download size={14} /> Exporter CSV</button>
        </div>}
      </div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      {d && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="rounded-xl p-4" style={carte}><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>Total versé aux livreurs</p><p className="font-display text-xl font-semibold">{fmt(d.total)} F</p></div>
            <div className="rounded-xl p-4" style={carte}><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>Nombre de paiements</p><p className="font-display text-xl font-semibold">{d.nb}</p></div>
            {d.parBoutique.map((b) => <div key={b.boutique} className="rounded-xl p-4" style={carte}><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>{b.boutique}</p><p className="font-display text-xl font-semibold">{fmt(b.total)} F</p></div>)}
          </div>
          {d.parMode?.length > 0 && <div className="rounded-xl p-4" style={carte}><p className="text-sm font-medium mb-2">Par moyen de paiement</p>
            {d.parMode.map((m) => <div key={m.mode} className="flex justify-between text-sm py-1"><span>{m.mode}</span><strong>{fmt(m.total)} F</strong></div>)}</div>}
          {d.parLivreur.length > 0 && <div className="rounded-xl p-4" style={carte}><p className="text-sm font-medium mb-2">Par livreur</p>
            {d.parLivreur.map((l) => <div key={l.livreur} className="flex justify-between text-sm py-1"><span>{l.livreur}</span><strong>{fmt(l.total)} F</strong></div>)}</div>}
          <div className="rounded-xl p-4" style={carte}>
            <p className="text-sm font-medium mb-2">Détail des paiements</p>
            {!d.paiements.length && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucun paiement sur cette période.</p>}
            <div className="overflow-x-auto"><table className="w-full text-sm"><tbody>
              {d.paiements.map((p) => (
                <tr key={p.id} style={{ borderTop: "1px solid #F1E9DC" }}>
                  <td className="py-2">{new Date(p.date).toLocaleDateString("fr-FR")}</td><td>{p.numero}</td><td>{p.livreurNom}</td><td>{p.boutique || "—"}</td><td>{p.mode}</td><td>{p.payeParNom || "—"}</td>
                  <td className="text-right font-medium">{fmt(p.montant)} F</td>
                  <td className="text-right"><button type="button" onClick={() => recu(p.id)} title="Réimprimer le reçu" style={{ color: "#6B5D52" }}><Printer size={15} /></button></td>
                </tr>))}
            </tbody></table></div>
            <p className="text-xs mt-3" style={{ color: "#6B5D52" }}>Seuls les paiements faits depuis la mise en service des reçus apparaissent ici. Seule la part des frais prise en charge par la boutique est enregistrée en dépenses, à la validation de la remise.</p>
          </div>
        </div>
      )}
    </div>
  );
}
