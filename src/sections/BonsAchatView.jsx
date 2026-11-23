import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Printer, X } from "lucide-react";
import { api } from "../api.js";
import { fmt } from "../constants.js";
import { Field, ErrorBanner, inputStyle, selectStyle } from "../components/Shared.jsx";

// Lot 7 (I1) : bons d'achat adressés aux fournisseurs (en euros ou en francs), à imprimer ou enregistrer en PDF.
const carte = { background: "#FFFFFF", border: "1px solid #EAE1D2" };
const bouton = { background: "#8C3B2E", color: "#FBF3EC", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 500 };
const contour = { border: "1px solid #DDD3C4", color: "#6B5D52", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 500 };
const STATUTS = { BROUILLON: "Brouillon", ENVOYE: "Envoyé", RECU_PARTIEL: "Reçu en partie", RECU: "Reçu", ANNULE: "Annulé" };
const dateFr = (d) => new Date(d).toLocaleDateString("fr-FR");
const montant = (n, devise) => (devise === "EUR" ? `${Number(n).toLocaleString("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €` : `${fmt(Math.round(n))} F`);
const ligneVide = () => ({ designation: "", pointure: "", quantite: "", prixUnitaire: "" });

export default function BonsAchat({ fournisseurs, onError }) {
  const [bons, setBons] = useState([]);
  const [forme, setForme] = useState(null);
  const [detail, setDetail] = useState(null);
  const charger = useCallback(async () => { try { setBons(await api.bonsAchat.liste()); } catch (e) { onError(e.message); } }, [onError]);
  useEffect(() => { charger(); }, [charger]);
  const enregistrer = async () => {
    try {
      const corps = { fournisseurId: forme.fournisseurId, devise: forme.devise, notes: forme.notes, lignes: forme.lignes.filter((l) => l.designation || l.quantite || l.prixUnitaire).map((l) => ({ designation: l.designation, pointure: l.pointure, quantite: Number(l.quantite), prixUnitaire: Number(String(l.prixUnitaire).replace(",", ".")) })) };
      const b = await api.bonsAchat.creer(corps);
      setForme(null); await charger(); setDetail(b);
    } catch (e) { onError(e.message); }
  };
  const changer = async (b, statut) => { try { setDetail(await api.bonsAchat.modifier(b.id, { statut })); charger(); } catch (e) { onError(e.message); } };
  const total = forme ? forme.lignes.reduce((s, l) => s + (Number(l.quantite) || 0) * (Number(String(l.prixUnitaire).replace(",", ".")) || 0), 0) : 0;
  return (
    <div>
      <button type="button" style={bouton} className="inline-flex items-center gap-2 mb-4" onClick={() => setForme({ fournisseurId: "", devise: "EUR", notes: "", lignes: [ligneVide()] })}><Plus size={14} /> Nouveau bon d'achat</button>
      {forme && (
        <div className="rounded-xl p-4 mb-5" style={carte}>
          <div className="grid sm:grid-cols-3 gap-3">
            <Field label="Fournisseur"><select value={forme.fournisseurId} onChange={(e) => setForme({ ...forme, fournisseurId: e.target.value })} style={inputStyle}><option value="">—</option>{fournisseurs.filter((f) => f.actif).map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}</select></Field>
            <Field label="Devise"><select value={forme.devise} onChange={(e) => setForme({ ...forme, devise: e.target.value })} style={inputStyle}><option value="EUR">Euros (€)</option><option value="XOF">Francs CFA (F)</option></select></Field>
            <Field label="Notes"><input value={forme.notes} onChange={(e) => setForme({ ...forme, notes: e.target.value })} style={inputStyle} /></Field>
          </div>
          <div className="mt-3 space-y-2">
            {forme.lignes.map((l, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center">
                <input placeholder="Désignation (modèle, collection…)" value={l.designation} onChange={(e) => setForme({ ...forme, lignes: forme.lignes.map((x, k) => (k === i ? { ...x, designation: e.target.value } : x)) })} style={{ ...selectStyle, gridColumn: "span 5" }} />
                <input placeholder="Pointure" value={l.pointure} onChange={(e) => setForme({ ...forme, lignes: forme.lignes.map((x, k) => (k === i ? { ...x, pointure: e.target.value } : x)) })} style={{ ...selectStyle, gridColumn: "span 2" }} />
                <input placeholder="Quantité" inputMode="numeric" value={l.quantite} onChange={(e) => setForme({ ...forme, lignes: forme.lignes.map((x, k) => (k === i ? { ...x, quantite: e.target.value.replace(/\D/g, "") } : x)) })} style={{ ...selectStyle, gridColumn: "span 2" }} />
                <input placeholder={`Prix unitaire (${forme.devise === "EUR" ? "€" : "F"})`} inputMode="decimal" value={l.prixUnitaire} onChange={(e) => setForme({ ...forme, lignes: forme.lignes.map((x, k) => (k === i ? { ...x, prixUnitaire: e.target.value } : x)) })} style={{ ...selectStyle, gridColumn: "span 2" }} />
                <button type="button" onClick={() => setForme({ ...forme, lignes: forme.lignes.length > 1 ? forme.lignes.filter((_, k) => k !== i) : [ligneVide()] })} style={{ gridColumn: "span 1" }}><Trash2 size={14} color="#B04A3B" /></button>
              </div>
            ))}
          </div>
          <button type="button" className="text-sm mt-2 underline" style={{ color: "#8C3B2E" }} onClick={() => setForme({ ...forme, lignes: [...forme.lignes, ligneVide()] })}>+ Ajouter une ligne</button>
          <p className="text-sm mt-3">Total : <strong>{montant(total, forme.devise)}</strong>{forme.devise === "EUR" && <> (≈ {fmt(Math.round(total * 655.957))} F)</>}</p>
          <div className="flex gap-2 mt-3"><button type="button" style={bouton} onClick={enregistrer} disabled={!forme.fournisseurId}>Enregistrer le bon</button><button type="button" style={contour} onClick={() => setForme(null)}>Annuler</button></div>
        </div>
      )}
      {!bons.length && <p className="text-sm py-3" style={{ color: "#6B5D52" }}>Aucun bon d'achat pour le moment.</p>}
      <div className="space-y-2">
        {bons.map((b) => (
          <button key={b.id} type="button" onClick={() => setDetail(b)} className="w-full text-left rounded-xl p-3 flex justify-between flex-wrap gap-2" style={carte}>
            <span className="text-sm"><strong>{b.numero}</strong> · {b.fournisseur?.nom} · {dateFr(b.date)} · {b.nbPaires} paire{b.nbPaires > 1 ? "s" : ""}</span>
            <span className="text-sm">{montant(b.total, b.devise)} · <span style={{ color: "#6B5D52" }}>{STATUTS[b.statut]}</span></span>
          </button>
        ))}
      </div>
      {detail && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-20" style={{ background: "rgba(43,35,32,0.45)" }}>
          <div className="rounded-xl p-6 max-w-2xl w-full max-h-[92vh] overflow-y-auto" style={{ background: "#FFFDF9" }} id="bon-achat-impression">
            <div className="flex justify-between items-start mb-3">
              <div><p className="font-display text-xl font-semibold">Bon d'achat {detail.numero}</p><p className="text-xs" style={{ color: "#6B5D52" }}>La Pointure Espagnole · {dateFr(detail.date)} · {STATUTS[detail.statut]}</p></div>
              <button className="no-print" onClick={() => setDetail(null)}><X size={18} color="#6B5D52" /></button>
            </div>
            <p className="text-sm mb-3">Fournisseur : <strong>{detail.fournisseur?.nom}</strong></p>
            <table className="w-full text-sm mb-3"><thead><tr style={{ color: "#6B5D52" }}><th className="text-left py-1">Désignation</th><th className="text-right">Pointure</th><th className="text-right">Qté</th><th className="text-right">Prix unit.</th><th className="text-right">Total</th></tr></thead>
              <tbody>{(detail.lignes || []).map((l) => (<tr key={l.id} style={{ borderTop: "1px solid #EFE7D9" }}><td className="py-1">{l.designation}</td><td className="text-right">{l.pointure || "—"}</td><td className="text-right">{l.quantite}</td><td className="text-right">{montant(l.prixUnitaire, detail.devise)}</td><td className="text-right">{montant(l.quantite * l.prixUnitaire, detail.devise)}</td></tr>))}</tbody></table>
            <p className="text-sm text-right"><strong>Total : {montant(detail.total, detail.devise)}</strong>{detail.devise === "EUR" && <span style={{ color: "#6B5D52" }}> (≈ {fmt(detail.totalFrancs)} F)</span>}</p>
            {detail.notes && <p className="text-xs mt-2" style={{ color: "#6B5D52" }}>{detail.notes}</p>}
            <div className="flex gap-2 flex-wrap mt-4 no-print">
              <button type="button" style={contour} className="inline-flex items-center gap-1" onClick={() => window.print()}><Printer size={14} /> Imprimer</button>
              {detail.statut === "BROUILLON" && <button type="button" style={bouton} onClick={() => changer(detail, "ENVOYE")}>Marquer comme envoyé</button>}
              {detail.statut === "ENVOYE" && <><button type="button" style={contour} onClick={() => changer(detail, "RECU_PARTIEL")}>Reçu en partie</button><button type="button" style={bouton} onClick={() => changer(detail, "RECU")}>Reçu en totalité</button></>}
              {!["ANNULE", "RECU"].includes(detail.statut) && <button type="button" style={contour} onClick={() => changer(detail, "ANNULE")}>Annuler le bon</button>}
              {detail.statut === "BROUILLON" && <button type="button" style={contour} onClick={async () => { try { await api.bonsAchat.supprimer(detail.id); setDetail(null); charger(); } catch (e) { onError(e.message); } }}>Supprimer</button>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
