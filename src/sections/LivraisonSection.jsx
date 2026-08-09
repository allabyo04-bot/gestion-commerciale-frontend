import { useState, useEffect, useCallback } from "react";
import { Plus, X, Search, Printer, Truck, CheckCircle2, RotateCcw, AlertTriangle } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { BOUTIQUES, POINTURES, MODES_PAIEMENT, fmt } from "../constants.js";
import { Field, ErrorBanner, inputStyle, selectStyle } from "../components/Shared.jsx";
import { ReceiptModal } from "./VentesSection.jsx";

function uid() { return `tmp_${Date.now()}_${Math.floor(Math.random() * 10000)}`; }

export default function LivraisonSection() {
  const { user } = useAuth();
  const estAdmin = !!user?.role?.systeme;
  const [subTab, setSubTab] = useState("nouveau");
  const [articles, setArticles] = useState([]);
  const [clients, setClients] = useState([]);
  const [bonsEnCours, setBonsEnCours] = useState([]);
  const [bonsHistorique, setBonsHistorique] = useState([]);
  const [error, setError] = useState("");
  const [ticketAImprimer, setTicketAImprimer] = useState(null);
  const [bonAReconcilier, setBonAReconcilier] = useState(null);
  const [receiptVente, setReceiptVente] = useState(null);

  const boutiqueDefaut = estAdmin ? "" : (user?.boutique || "");

  useEffect(() => {
    api.articles.list().then(setArticles).catch((e) => setError(e.message));
    api.clients.list().then(setClients).catch((e) => setError(e.message));
  }, []);

  const charger = useCallback(async () => {
    try {
      const [enCours, historique] = await Promise.all([
        api.bonsLivraison.lister({ statut: "EN_COURS" }),
        api.bonsLivraison.lister({}),
      ]);
      setBonsEnCours(enCours);
      setBonsHistorique(historique.filter((b) => b.statut !== "EN_COURS"));
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  return (
    <div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      <div className="flex gap-2 mb-6">
        {[["nouveau", "Nouveau bon"], ["encours", `En cours (${bonsEnCours.length})`], ["historique", "Historique"]].map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)} className="px-4 py-2 rounded-full text-sm font-medium" style={subTab === id ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>{label}</button>
        ))}
      </div>

      {subTab === "nouveau" && (
        <NouveauBonForm
          articles={articles} boutiqueDefaut={boutiqueDefaut} clients={clients}
          onCree={(bon) => { setTicketAImprimer(bon); charger(); }}
          onError={setError}
        />
      )}

      {subTab === "encours" && (
        <div className="space-y-3">
          {bonsEnCours.length === 0 && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucun bon de livraison en cours.</p>}
          {bonsEnCours.map((b) => (
            <div key={b.id} className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium text-sm">{b.numero} — {b.clientNom} {b.clientTelephone ? `(${b.clientTelephone})` : ""}</p>
                  <p className="text-xs" style={{ color: "#6B5D52" }}>{b.boutique} · livreur : {b.livreurNom || "—"} · parti le {new Date(b.dateCreation).toLocaleString("fr-FR")}</p>
                  <p className="text-xs mt-1" style={{ color: "#6B5D52" }}>{b.lignes.map((l) => `${l.article.designation}${l.pointure ? ` T${l.pointure}` : ""} x${l.quantite}`).join(", ")}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setTicketAImprimer(b)} className="text-xs px-3 py-1.5 rounded-lg" style={{ border: "1px solid #DDD3C4", color: "#6B5D52" }}>Réimprimer</button>
                  <button onClick={() => setBonAReconcilier(b)} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Retour du livreur</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === "historique" && (
        <div className="space-y-3">
          {bonsHistorique.length === 0 && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucun bon clôturé pour l'instant.</p>}
          {bonsHistorique.map((b) => (
            <div key={b.id} className="rounded-xl p-4" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <p className="font-medium text-sm">{b.numero} — {b.clientNom}</p>
                  <p className="text-xs" style={{ color: "#6B5D52" }}>
                    {b.boutique} · {b.statut === "ANNULE" ? "Annulé" : `Clôturé le ${new Date(b.dateCloture).toLocaleString("fr-FR")} par ${b.cloturePar?.prenom || ""}`}
                    {b.venteGeneree ? ` · Vente ${b.venteGeneree.numero} (${fmt(b.venteGeneree.total)} F)` : ""}
                  </p>
                </div>
                <span className="text-xs px-2 py-0.5 rounded-full" style={b.statut === "ANNULE" ? { background: "#FBEAE7", color: "#B04A3B" } : { background: "#E9F0EA", color: "#3F6B4A" }}>
                  {b.statut === "ANNULE" ? "Annulé" : "Clôturé"}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {ticketAImprimer && <BonLivraisonTicket bon={ticketAImprimer} onClose={() => setTicketAImprimer(null)} />}
      {bonAReconcilier && (
        <ReconciliationModal
          bon={bonAReconcilier} clients={clients}
          onClose={() => setBonAReconcilier(null)}
          onCloture={(res) => { setBonAReconcilier(null); charger(); if (res.vente) setReceiptVente(res.vente); }}
          onError={setError}
        />
      )}
      {receiptVente && <ReceiptModal vente={receiptVente} onClose={() => setReceiptVente(null)} />}
    </div>
  );
}

// ------------------------------------------------------------
// NOUVEAU BON — départ du livreur : ce qui sort décrémente le stock tout de suite.
// ------------------------------------------------------------
function NouveauBonForm({ articles, boutiqueDefaut, clients, onCree, onError }) {
  const [boutique, setBoutique] = useState(boutiqueDefaut);
  const [clientNom, setClientNom] = useState("");
  const [clientTelephone, setClientTelephone] = useState("");
  const [clientId, setClientId] = useState("");
  const [livreurNom, setLivreurNom] = useState("");
  const [notes, setNotes] = useState("");

  const [rechercheArticle, setRechercheArticle] = useState("");
  const [articleChoisi, setArticleChoisi] = useState(null);
  const [pointureChoisie, setPointureChoisie] = useState("");
  const [quantiteChoisie, setQuantiteChoisie] = useState("1");
  const [lignes, setLignes] = useState([]);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const resultatsRecherche = rechercheArticle.trim()
    ? (articles || []).filter((a) => a.designation.toLowerCase().includes(rechercheArticle.trim().toLowerCase()) || a.reference.toLowerCase().includes(rechercheArticle.trim().toLowerCase())).slice(0, 8)
    : [];

  const choisirArticle = (a) => { setArticleChoisi(a); setRechercheArticle(""); setPointureChoisie(""); setQuantiteChoisie("1"); };

  const ajouterLigne = () => {
    if (!articleChoisi) { onError("Choisis un article."); return; }
    if (articleChoisi.famille === "Chaussure" && !pointureChoisie) { onError("Choisis une pointure."); return; }
    const quantite = parseInt(quantiteChoisie, 10);
    if (!quantite || quantite <= 0) { onError("Indique une quantité valide."); return; }
    setLignes([...lignes, { id: uid(), articleId: articleChoisi.id, designation: articleChoisi.designation, pointure: articleChoisi.famille === "Chaussure" ? pointureChoisie : "", quantite, prixVente: articleChoisi.prixVente }]);
    setArticleChoisi(null); setPointureChoisie(""); setQuantiteChoisie("1");
  };
  const retirerLigne = (id) => setLignes(lignes.filter((l) => l.id !== id));

  const valider = async () => {
    if (!boutique) { onError("Choisis la boutique concernée."); return; }
    if (!clientNom.trim()) { onError("Le nom du client est obligatoire."); return; }
    if (lignes.length === 0) { onError("Ajoute au moins un article au bon de livraison."); return; }
    setEnvoiEnCours(true);
    try {
      const bon = await api.bonsLivraison.creer({
        boutique, clientNom, clientTelephone: clientTelephone || undefined, clientId: clientId || undefined,
        livreurNom: livreurNom || undefined, notes: notes || undefined,
        lignes: lignes.map(({ articleId, pointure, quantite }) => ({ articleId, pointure, quantite })),
      });
      onCree(bon);
      setClientNom(""); setClientTelephone(""); setClientId(""); setLivreurNom(""); setNotes(""); setLignes([]);
    } catch (e) { onError(e.message); } finally { setEnvoiEnCours(false); }
  };

  return (
    <div className="rounded-2xl p-5" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
      <p className="font-display text-lg font-semibold mb-1">Nouveau bon de livraison</p>
      <p className="text-xs mb-4" style={{ color: "#6B5D52" }}>Le stock est retiré dès l'enregistrement — c'est le départ du livreur qui est noté ici, pas encore une vente.</p>

      <div className="grid sm:grid-cols-2 gap-3 mb-4">
        <div>
          <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Boutique</label>
          <select value={boutique} onChange={(e) => setBoutique(e.target.value)} style={selectStyle}>
            <option value="">— Choisir —</option>
            {BOUTIQUES.map((b) => <option key={b}>{b}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Livreur (optionnel)</label>
          <input value={livreurNom} onChange={(e) => setLivreurNom(e.target.value)} style={selectStyle} placeholder="Nom du livreur" />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Nom du client</label>
          <input value={clientNom} onChange={(e) => setClientNom(e.target.value)} style={selectStyle} placeholder="Ex : Mme OUEDRAOGO" />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Téléphone client (optionnel)</label>
          <input value={clientTelephone} onChange={(e) => setClientTelephone(e.target.value)} style={selectStyle} />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Rattacher à une fiche client existante (optionnel)</label>
          <select value={clientId} onChange={(e) => { setClientId(e.target.value); const c = (clients || []).find((cl) => cl.id === e.target.value); if (c) { setClientNom(c.nomPrenoms); setClientTelephone(c.telephone || ""); } }} style={selectStyle}>
            <option value="">— Aucune —</option>
            {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.nomPrenoms}{c.carteFidelite ? ` · Carte ${c.carteFidelite}` : ""}</option>)}
          </select>
        </div>
      </div>

      <div className="rounded-xl p-4 mb-4" style={{ background: "#FAF7F2", border: "1px solid #EFE7D9" }}>
        <p className="text-sm font-medium mb-3">Articles emportés par le livreur</p>
        <div className="relative mb-3">
          <input value={rechercheArticle} onChange={(e) => { setRechercheArticle(e.target.value); setArticleChoisi(null); }} placeholder="Rechercher par désignation ou référence…" style={{ ...selectStyle, paddingLeft: "32px", width: "100%" }} />
          <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color="#6B5D52" />
          {resultatsRecherche.length > 0 && (
            <div className="absolute z-10 w-full mt-1 rounded-lg overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2", maxHeight: "220px", overflowY: "auto" }}>
              {resultatsRecherche.map((a) => (
                <button key={a.id} type="button" onClick={() => choisirArticle(a)} className="w-full text-left px-3 py-2 text-sm" style={{ borderTop: "1px solid #EFE7D9" }}>
                  {a.designation} <span style={{ color: "#6B5D52" }}>({a.reference})</span>
                </button>
              ))}
            </div>
          )}
        </div>
        {articleChoisi && (
          <div className="grid sm:grid-cols-4 gap-3 items-end">
            <div className="sm:col-span-1"><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>Article</p><p className="text-sm font-medium">{articleChoisi.designation}</p></div>
            {articleChoisi.famille === "Chaussure" && (
              <div>
                <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Pointure</label>
                <select value={pointureChoisie} onChange={(e) => setPointureChoisie(e.target.value)} style={selectStyle}>
                  <option value="">—</option>
                  {POINTURES.map((p) => <option key={p} value={p}>T{p}</option>)}
                </select>
              </div>
            )}
            <div>
              <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Quantité</label>
              <input type="number" min="1" value={quantiteChoisie} onChange={(e) => setQuantiteChoisie(e.target.value)} style={selectStyle} />
            </div>
            <button onClick={ajouterLigne} className="px-3 py-2 rounded-lg text-sm font-medium whitespace-nowrap" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Ajouter</button>
          </div>
        )}
      </div>

      {lignes.length > 0 && (
        <div className="rounded-xl overflow-hidden mb-4" style={{ border: "1px solid #EAE1D2" }}>
          <table className="w-full text-sm">
            <thead><tr style={{ background: "#F1E9DC", color: "#6B5D52" }}><th className="text-left px-3 py-2">Article</th><th className="text-left px-3 py-2">Pointure</th><th className="text-right px-3 py-2">Quantité</th><th></th></tr></thead>
            <tbody>
              {lignes.map((l) => (
                <tr key={l.id} style={{ borderTop: "1px solid #EFE7D9" }}>
                  <td className="px-3 py-2">{l.designation}</td>
                  <td className="px-3 py-2">{l.pointure ? `T${l.pointure}` : "—"}</td>
                  <td className="text-right px-3 py-2">{l.quantite}</td>
                  <td className="text-right px-3 py-2"><button onClick={() => retirerLigne(l.id)} style={{ color: "#B04A3B" }}><X size={14} /></button></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="mb-4">
        <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Notes (optionnel)</label>
        <input value={notes} onChange={(e) => setNotes(e.target.value)} style={selectStyle} placeholder="Ex : livraison prévue avant 18h" />
      </div>

      <button onClick={valider} disabled={envoiEnCours || lignes.length === 0} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC", opacity: envoiEnCours || lignes.length === 0 ? 0.6 : 1 }}>
        <Truck size={16} /> {envoiEnCours ? "Enregistrement..." : "Enregistrer le départ et imprimer le bon"}
      </button>
    </div>
  );
}

// ------------------------------------------------------------
// TICKET IMPRIMABLE — deux exemplaires : copie livreur (à signer) + copie boutique.
// ------------------------------------------------------------
function BonLivraisonTicket({ bon, onClose }) {
  const corps = (mention) => (
    <div style={{ width: "280px", background: "#FFFFFF", padding: "16px", fontFamily: "monospace", fontSize: "12px", color: "#2B2320" }}>
      <p className="text-center font-bold mb-1">BON DE LIVRAISON</p>
      <p className="text-center mb-2">{bon.numero}</p>
      <p style={{ borderTop: "1px dashed #999", paddingTop: "6px" }}>{bon.boutique}</p>
      <p>Client : {bon.clientNom}</p>
      {bon.clientTelephone && <p>Tél : {bon.clientTelephone}</p>}
      <p>Livreur : {bon.livreurNom || "—"}</p>
      <p>Date : {new Date(bon.dateCreation).toLocaleString("fr-FR")}</p>
      <div style={{ borderTop: "1px dashed #999", marginTop: "6px", paddingTop: "6px" }}>
        {bon.lignes.map((l) => (
          <p key={l.id}>- {l.article?.designation || l.designation}{l.pointure ? ` T${l.pointure}` : ""} x{l.quantite} ({fmt(l.prixUnitaire)} F/u)</p>
        ))}
      </div>
      {bon.notes && <p style={{ borderTop: "1px dashed #999", marginTop: "6px", paddingTop: "6px" }}>Note : {bon.notes}</p>}
      <p className="text-center font-bold mt-4" style={{ borderTop: "2px solid #2B2320", paddingTop: "6px" }}>{mention}</p>
      {mention.includes("LIVREUR") && (
        <p className="mt-6" style={{ borderTop: "1px solid #999", paddingTop: "4px" }}>Signature du livreur : ____________________</p>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FFFDF9" }}>
        <div className="no-print flex items-center justify-between mb-4">
          <p className="font-display text-lg font-semibold">Bon {bon.numero}</p>
          <button onClick={onClose} style={{ color: "#6B5D52" }}><X size={18} /></button>
        </div>
        <div id="ticket-livraison-print">
          {corps("COPIE LIVREUR — À SIGNER")}
          <div style={{ borderTop: "2px dashed #999", margin: "16px 0" }} />
          {corps("COPIE BOUTIQUE")}
        </div>
        <button onClick={() => window.print()} className="no-print w-full mt-5 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>
          <Printer size={15} /> Imprimer les 2 exemplaires
        </button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------
// RÉCONCILIATION — retour du livreur : chaque ligne devient Vendu / Retourné / Perdu.
// ------------------------------------------------------------
function ReconciliationModal({ bon, clients, onClose, onCloture, onError }) {
  const [statuts, setStatuts] = useState(Object.fromEntries(bon.lignes.map((l) => [l.id, "VENDU"])));
  const [clientId, setClientId] = useState(bon.clientId || "");
  const [typeVente, setTypeVente] = useState("Comptant");
  const [paiements, setPaiements] = useState([{ id: uid(), mode: "especes", montant: "" }]);
  const [envoiEnCours, setEnvoiEnCours] = useState(false);

  const lignesVendues = bon.lignes.filter((l) => statuts[l.id] === "VENDU");
  const totalVendu = lignesVendues.reduce((s, l) => s + l.prixUnitaire * l.quantite, 0);
  const totalPaye = paiements.reduce((s, p) => s + (Number(p.montant) || 0), 0);

  const ajouterPaiement = () => setPaiements([...paiements, { id: uid(), mode: "especes", montant: "" }]);
  const majPaiement = (id, champ, val) => setPaiements(paiements.map((p) => (p.id === id ? { ...p, [champ]: val } : p)));
  const retirerPaiement = (id) => setPaiements(paiements.filter((p) => p.id !== id));

  const cloturer = async () => {
    if (lignesVendues.length > 0) {
      if (typeVente === "Comptant" && totalPaye < totalVendu) { onError("Le total payé est inférieur au total des articles vendus."); return; }
      if (typeVente === "Credit" && totalPaye > totalVendu) { onError("Le montant payé ne peut pas dépasser le total pour une vente à crédit."); return; }
    }
    setEnvoiEnCours(true);
    try {
      const res = await api.bonsLivraison.cloturer(bon.id, {
        clientId: clientId || undefined, typeVente,
        paiements: lignesVendues.length > 0 ? paiements.filter((p) => Number(p.montant) > 0).map((p) => ({ mode: p.mode, montant: Number(p.montant) })) : [],
        lignes: bon.lignes.map((l) => ({ ligneId: l.id, statut: statuts[l.id] })),
      });
      onCloture(res);
    } catch (e) { onError(e.message); } finally { setEnvoiEnCours(false); }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FFFDF9" }}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-display text-lg font-semibold">Retour du livreur — {bon.numero}</p>
          <button onClick={onClose} style={{ color: "#6B5D52" }}><X size={18} /></button>
        </div>
        <p className="text-xs mb-4" style={{ color: "#6B5D52" }}>{bon.clientNom} · {bon.boutique}</p>

        <div className="space-y-2 mb-5">
          {bon.lignes.map((l) => (
            <div key={l.id} className="rounded-lg p-3 flex items-center justify-between flex-wrap gap-2" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
              <div>
                <p className="text-sm font-medium">{l.article.designation}{l.pointure ? ` T${l.pointure}` : ""} x{l.quantite}</p>
                <p className="text-xs" style={{ color: "#6B5D52" }}>{fmt(l.prixUnitaire)} F / unité</p>
              </div>
              <div className="flex gap-1.5">
                {[["VENDU", "Vendu", "#3F6B4A", "#E9F0EA"], ["RETOURNE", "Rendu", "#6B5D52", "#F1E9DC"], ["PERDU", "Perdu/cassé", "#B04A3B", "#FBEAE7"]].map(([val, label, fg, bg]) => (
                  <button key={val} onClick={() => setStatuts({ ...statuts, [l.id]: val })} className="text-xs px-2.5 py-1.5 rounded-full font-medium" style={statuts[l.id] === val ? { background: fg, color: "#FBF3EC" } : { background: bg, color: fg }}>
                    {label}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>

        {lignesVendues.length > 0 && (
          <div className="rounded-xl p-4 mb-4" style={{ background: "#F1E9DC" }}>
            <p className="text-sm font-semibold mb-3">Encaissement — {fmt(totalVendu)} F à percevoir</p>
            <div className="grid sm:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Type de vente</label>
                <select value={typeVente} onChange={(e) => setTypeVente(e.target.value)} style={selectStyle}>
                  <option value="Comptant">Comptant</option>
                  <option value="Credit">Crédit</option>
                </select>
              </div>
              <div>
                <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Client (pour la vente)</label>
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} style={selectStyle}>
                  <option value="">— Aucune fiche —</option>
                  {(clients || []).map((c) => <option key={c.id} value={c.id}>{c.nomPrenoms}</option>)}
                </select>
              </div>
            </div>
            {paiements.map((p) => (
              <div key={p.id} className="flex items-center gap-2 mb-2">
                <select value={p.mode} onChange={(e) => majPaiement(p.id, "mode", e.target.value)} style={{ ...selectStyle, flex: 1 }}>
                  {MODES_PAIEMENT.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                </select>
                <input type="number" value={p.montant} onChange={(e) => majPaiement(p.id, "montant", e.target.value)} placeholder="Montant" style={{ ...selectStyle, width: "140px" }} />
                {paiements.length > 1 && <button onClick={() => retirerPaiement(p.id)} style={{ color: "#B04A3B" }}><X size={14} /></button>}
              </div>
            ))}
            <button onClick={ajouterPaiement} className="text-xs" style={{ color: "#8C3B2E" }}>+ Ajouter un mode de paiement</button>
            <p className="text-xs mt-2" style={{ color: totalPaye < totalVendu ? "#B04A3B" : "#3F6B4A" }}>
              Payé : {fmt(totalPaye)} F {typeVente === "Comptant" && totalPaye < totalVendu ? `— reste ${fmt(totalVendu - totalPaye)} F` : ""}
            </p>
          </div>
        )}

        <button onClick={cloturer} disabled={envoiEnCours} className="w-full flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC", opacity: envoiEnCours ? 0.6 : 1 }}>
          <CheckCircle2 size={16} /> {envoiEnCours ? "Enregistrement..." : "Clôturer le bon de livraison"}
        </button>
      </div>
    </div>
  );
}
