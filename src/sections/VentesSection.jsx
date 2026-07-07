import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, X, ShoppingCart, Printer, Wallet, Search, Minus, PauseCircle, PlayCircle, RotateCcw, Gift } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { BOUTIQUES, POINTURES, MODES_VENTE, MODES_PAIEMENT, INFOS_BOUTIQUE, MESSAGE_FIN_TICKET, fmt } from "../constants.js";
import { Field, ErrorBanner, inputStyle } from "../components/Shared.jsx";

function uid() { return `tmp_${Date.now()}_${Math.floor(Math.random() * 10000)}`; }

export default function VentesSection() {
  const { user } = useAuth();
  const [subTab, setSubTab] = useState("nouvelle");
  const [articles, setArticles] = useState([]);
  const [brands, setBrands] = useState([]);
  const [clients, setClients] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [attentes, setAttentes] = useState([]);
const [ventesCredit, setVentesCredit] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [receipt, setReceipt] = useState(null);

  const [boutique, setBoutique] = useState(user?.boutique || BOUTIQUES[0]);
  const [clientId, setClientId] = useState("");
  const [clientSearch, setClientSearch] = useState("");
  const [modeVente, setModeVente] = useState(MODES_VENTE[0]);
const [typeVente, setTypeVente] = useState("Comptant");
  const [lignes, setLignes] = useState([]);
  const [paiements, setPaiements] = useState([]);

  const [selArticle, setSelArticle] = useState("");
  const [selPointure, setSelPointure] = useState("");
  const [selQty, setSelQty] = useState(1);

  const brandName = (id) => brands.find((b) => b.id === id)?.nom || "—";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b, c, v, at, vc] = await Promise.all([
        api.articles.list(), api.brands.list(), api.clients.list(),
        api.ventes.list({ boutique }), api.ventesAttente.list(boutique), api.ventes.creditListe({ boutique }),
      ]);
      setArticles(a); setBrands(b); setClients(c); setVentes(v); setAttentes(at); setVentesCredit(vc);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [boutique]);
  useEffect(() => { load(); }, [load]);

  const currentArticle = articles.find((a) => a.id === selArticle);
  const disponibilite = (article, b, pointure) => {
    if (!article) return 0;
    const item = article.stocks?.find((s) => s.boutique === b && s.pointure === (pointure || null));
    return item?.quantite || 0;
  };

  const total = lignes.reduce((s, l) => s + l.sousTotal, 0);
  const totalPaye = paiements.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const reste = total - totalPaye;

  const addLigne = () => {
    if (!currentArticle) { setError("Choisis un article."); return; }
    if (currentArticle.famille === "Chaussure" && !selPointure) { setError("Choisis une pointure."); return; }
    const qty = Math.max(1, parseInt(selQty, 10) || 1);
    const dispo = disponibilite(currentArticle, boutique, selPointure);
    const dejaDansPanier = lignes.filter((l) => l.articleId === currentArticle.id && l.pointure === (selPointure || null)).reduce((s, l) => s + l.quantite, 0);
    if (qty + dejaDansPanier > dispo) { setError(`Stock insuffisant : ${dispo} disponible(s).`); return; }
    setError("");
    setLignes([...lignes, {
      id: uid(), articleId: currentArticle.id, designation: currentArticle.designation,
      marque: brandName(currentArticle.marqueId), famille: currentArticle.famille,
      pointure: selPointure || null, quantite: qty, prixUnitaire: Number(currentArticle.prixVente),
      sousTotal: qty * Number(currentArticle.prixVente),
    }]);
    setSelArticle(""); setSelPointure(""); setSelQty(1);
  };
  const removeLigne = (id) => setLignes(lignes.filter((l) => l.id !== id));

  const addPaiement = (mode) => setPaiements([...paiements, { id: uid(), mode, montant: reste > 0 ? reste : "", carteNumero: "" }]);
  const updatePaiement = (id, patch) => setPaiements(paiements.map((p) => (p.id === id ? { ...p, ...patch } : p)));
  const removePaiement = (id) => setPaiements(paiements.filter((p) => p.id !== id));

  const resetVente = () => { setLignes([]); setPaiements([]); setClientId(""); setClientSearch(""); setModeVente(MODES_VENTE[0]); };

  const validerVente = async () => {
    if (lignes.length === 0) { setError("Ajoute au moins un article à la vente."); return; }
if (typeVente === "Credit" && !clientId) { setError("Un client est obligatoire pour une vente à crédit."); return; }
    if (typeVente === "Comptant" && totalPaye < total) { setError("Le total payé est inférieur au total de la vente."); return; }
    try {
      const vente = await api.ventes.create({
        boutique, vendeurId: user.id, modeVente, typeVente, clientId: clientId || null,
        lignes: lignes.map(({ articleId, pointure, quantite }) => ({ articleId, pointure, quantite })),
        paiements: paiements.map((p) => ({ mode: p.mode, montant: Number(p.montant), carteNumero: p.mode === "bon_achat" ? p.carteNumero : undefined })),
      });
      setReceipt(vente);
      resetVente();
      setError("");
      load();
    } catch (e) { setError(e.message); }
  };

  const mettreEnAttente = async () => {
    if (lignes.length === 0) { setError("Le panier est vide."); return; }
    try {
      const clientSel = clients.find((c) => c.id === clientId);
      await api.ventesAttente.create({
        boutique, vendeurId: user.id, clientId: clientId || null, modeVente,
        label: clientSel ? clientSel.nomPrenoms : undefined,
        panier: lignes, paiements,
      });
      resetVente();
      setSubTab("attente");
      load();
    } catch (e) { setError(e.message); }
  };

  const reprendreAttente = async (ticket) => {
    setLignes(ticket.panier || []);
    setPaiements(ticket.paiements || []);
    setClientId(ticket.clientId || "");
    setModeVente(ticket.modeVente || MODES_VENTE[0]);
    try { await api.ventesAttente.remove(ticket.id); } catch { /* déjà supprimé, tant pis */ }
    setSubTab("nouvelle");
    load();
  };

  const annulerAttente = async (ticket) => {
    try { await api.ventesAttente.remove(ticket.id); load(); } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <ErrorBanner error={error} onClose={() => setError("")} />

      <div className="flex gap-2 mb-6 no-print flex-wrap">
        {[["nouvelle", "Nouvelle vente"], ["attente", `En attente (${attentes.length})`], ["credit", `Ventes à crédit (${ventesCredit.length})`], ["historique", "Historique"], ["retours", "Retours / Échanges"], ["cartes", "Cartes cadeaux"]].map(([id, label]) => (

<button key={id} onClick={() => setSubTab(id)} className="px-4 py-2 rounded-full text-sm font-medium" style={subTab === id ? { background: "#8C3B2E", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>{label}</button>
        ))}
      </div>
      {subTab === "nouvelle" && (
        <div className="grid lg:grid-cols-5 gap-6">
          <div className="lg:col-span-3">
            <div className="rounded-xl p-5 mb-4" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Boutique">
                  {user?.role?.systeme ? (
                    <select value={boutique} onChange={(e) => setBoutique(e.target.value)} style={inputStyle}>{BOUTIQUES.map((b) => <option key={b}>{b}</option>)}</select>
                  ) : (
                    <div style={{ ...inputStyle, background: "#F1E9DC", color: "#6B5D52" }}>{boutique}</div>
                  )}
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Mode de vente"><select value={modeVente} onChange={(e) => setModeVente(e.target.value)} style={inputStyle}>{MODES_VENTE.map((m) => <option key={m}>{m}</option>)}</select></Field>
<Field label="Type de vente">
                  <div className="flex gap-2 mt-1">
                    <button type="button" onClick={() => setTypeVente("Comptant")} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium" style={typeVente === "Comptant" ? { background: "#8C3B2E", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>Comptant</button>
                    <button type="button" onClick={() => setTypeVente("Credit")} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium" style={typeVente === "Credit" ? { background: "#8C3B2E", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>Crédit</button>
                  </div>
                </Field>
                <Field label="Client (nom ou n° carte)">
                  {clientId ? (
                    <div className="flex items-center justify-between mt-1 px-3 py-2 rounded-lg" style={{ background: "#F1E9DC" }}>
                      <span className="text-sm">{clients.find((c) => c.id === clientId)?.nomPrenoms}</span>
                      <button onClick={() => { setClientId(""); setClientSearch(""); }} style={{ color: "#B04A3B" }}><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="relative mt-1">
                      <input value={clientSearch} onChange={(e) => setClientSearch(e.target.value)} style={{ ...inputStyle, marginTop: 0, paddingLeft: "30px" }} placeholder="Rechercher…" />
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color="#6B5D52" />
                      {clientSearch.trim() && (
                        <div className="absolute z-10 w-full mt-1 rounded-lg overflow-hidden max-h-40 overflow-y-auto" style={{ background: "#FFFFFF", border: "1px solid #DDD3C4" }}>
                          {clients.filter((c) => c.nomPrenoms.toLowerCase().includes(clientSearch.toLowerCase()) || (c.carteFidelite || "").toLowerCase().includes(clientSearch.toLowerCase())).slice(0, 6).map((c) => (
                            <button key={c.id} onClick={() => { setClientId(c.id); setClientSearch(""); }} className="w-full text-left px-3 py-2 text-sm" style={{ background: "#FFFFFF" }}>
                              {c.nomPrenoms} {c.carteFidelite ? <span className="font-mono text-xs" style={{ color: "#6B5D52" }}>· {c.carteFidelite}</span> : null}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </Field>
              </div>
            </div>

            <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
              <p className="font-display font-semibold mb-3">Ajouter un article</p>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Article">
                  <select value={selArticle} onChange={(e) => { setSelArticle(e.target.value); setSelPointure(""); }} style={inputStyle}>
                    <option value="">— Choisir —</option>
                    {articles.filter((a) => a.actif !== false).map((a) => <option key={a.id} value={a.id}>{a.designation} · {brandName(a.marqueId)}</option>)}
                  </select>
                </Field>
                {currentArticle?.famille === "Chaussure" ? (
                  <Field label="Pointure">
                    <select value={selPointure} onChange={(e) => setSelPointure(e.target.value)} style={inputStyle}>
                      <option value="">— Choisir —</option>
                      {POINTURES.map((p) => { const dispo = disponibilite(currentArticle, boutique, p); return <option key={p} value={p} disabled={dispo <= 0}>T{p} ({dispo} dispo.)</option>; })}
                    </select>
                  </Field>
                ) : (
                  <Field label="Disponible"><div style={{ ...inputStyle, background: "#F1E9DC", color: "#6B5D52" }}>{currentArticle ? `${disponibilite(currentArticle, boutique)} en stock` : "—"}</div></Field>
                )}
                <Field label="Quantité"><input type="number" min="1" value={selQty} onChange={(e) => setSelQty(e.target.value)} style={inputStyle} /></Field>
              </div>
              <button onClick={addLigne} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}><Plus size={16} /> Ajouter au panier</button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
              <p className="font-display font-semibold mb-3 flex items-center gap-2"><ShoppingCart size={16} /> Panier</p>
              {lignes.length === 0 && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucun article ajouté.</p>}
              <div className="space-y-2">
                {lignes.map((l) => (
                  <div key={l.id} className="flex items-center justify-between text-sm pb-2" style={{ borderBottom: "1px solid #EFE7D9" }}>
                    <div><p className="font-medium">{l.designation}{l.pointure ? ` · T${l.pointure}` : ""}</p><p className="text-xs font-mono" style={{ color: "#6B5D52" }}>{l.quantite} × {fmt(l.prixUnitaire)} F</p></div>
                    <div className="flex items-center gap-3"><p className="font-mono">{fmt(l.sousTotal)} F</p><button onClick={() => removeLigne(l.id)} style={{ color: "#B04A3B" }}><Trash2 size={14} /></button></div>
                  </div>
                ))}
              </div>
              <div className="flex items-center justify-between mt-4 pt-3" style={{ borderTop: "1px solid #EAE1D2" }}>
                <p className="font-display font-semibold">Total</p><p className="font-display text-xl font-semibold" style={{ color: "#8C3B2E" }}>{fmt(total)} F</p>
              </div>
            </div>

            <div className="rounded-xl p-5 mt-4" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
              <p className="font-display font-semibold mb-3 flex items-center gap-2"><Wallet size={16} /> Paiement (mixte possible)</p>
              <div className="flex gap-2 mb-3 flex-wrap">
                {MODES_PAIEMENT.map(({ id, label }) => (
                  <button key={id} onClick={() => addPaiement(id)} className="px-3 py-1.5 rounded-full text-xs font-medium" style={{ border: "1px solid #DDD3C4", color: "#6B5D52" }}>{label}</button>
                ))}
              </div>
              <div className="space-y-2">
                {paiements.map((p) => {
                  const mode = MODES_PAIEMENT.find((m) => m.id === p.mode);
                  return (
                    <div key={p.id}>
                      <div className="flex items-center gap-2">
                        <span className="text-xs w-28 shrink-0" style={{ color: "#6B5D52" }}>{mode?.label}</span>
                        <input type="number" min="0" value={p.montant} onChange={(e) => updatePaiement(p.id, { montant: e.target.value })} style={{ ...inputStyle, marginTop: 0 }} />
                        <button onClick={() => removePaiement(p.id)} style={{ color: "#B04A3B" }}><Minus size={14} /></button>
                      </div>
                      {p.mode === "bon_achat" && (
                        <input value={p.carteNumero} onChange={(e) => updatePaiement(p.id, { carteNumero: e.target.value })} placeholder="Numéro de la carte cadeau" style={{ ...inputStyle, marginTop: "6px" }} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3 text-sm"><span style={{ color: "#6B5D52" }}>Payé</span><span className="font-mono">{fmt(totalPaye)} F</span></div>
              <div className="flex items-center justify-between text-sm"><span style={{ color: reste > 0 ? "#B04A3B" : "#3F6B4A" }}>{reste > 0 ? "Reste à payer" : "Monnaie à rendre"}</span><span className="font-mono" style={{ color: reste > 0 ? "#B04A3B" : "#3F6B4A" }}>{fmt(Math.abs(reste))} F</span></div>
              <div className="flex gap-2 mt-4">
                <button onClick={mettreEnAttente} className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium" style={{ border: "1px solid #DDD3C4", color: "#6B5D52" }}><PauseCircle size={16} /> Mettre en attente</button>
                <button onClick={validerVente} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: "#3F6B4A", color: "#F3F7F3" }}>Valider la vente</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {subTab === "attente" && (
        <div className="space-y-3">
          {attentes.length === 0 && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucune vente en attente pour {boutique}.</p>}
          {attentes.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-xl p-4 flex-wrap gap-2" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
              <div>
                <p className="font-medium text-sm">{t.label}</p>
                <p className="text-xs" style={{ color: "#6B5D52" }}>{new Date(t.createdAt).toLocaleTimeString("fr-FR")} · {(t.panier || []).length} article(s)</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => reprendreAttente(t)} className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}><PlayCircle size={14} /> Reprendre</button>
                <button onClick={() => annulerAttente(t)} className="px-3 py-1.5 rounded-lg text-xs" style={{ color: "#B04A3B" }}>Annuler</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {subTab === "historique" && (
        <div className="space-y-3">
          {ventes.map((v) => (
            <div key={v.id} className="rounded-xl p-4 flex items-center justify-between flex-wrap gap-2 cursor-pointer card-hover" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }} onClick={() => setReceipt(v)}>
              <div><p className="font-mono text-sm font-medium">{v.numero}</p><p className="text-xs" style={{ color: "#6B5D52" }}>{new Date(v.date).toLocaleString("fr-FR")} · {v.boutique} · {v.vendeur?.prenom} {v.vendeur?.nom} · {v.modeVente}</p></div>
              <p className="font-display font-semibold" style={{ color: "#8C3B2E" }}>{fmt(v.total)} F</p>
            </div>
          ))}
        </div>
      )}

      {subTab === "retours" && <RetoursSection ventes={ventes} boutique={boutique} onDone={load} />}
      {subTab === "cartes" && <CartesCadeauxSection />}
{subTab === "credit" && <CreditSection ventesCredit={ventesCredit} onDone={load} />}

      {receipt && <ReceiptModal vente={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}

function ReceiptModal({ vente, onClose }) {
  const infos = INFOS_BOUTIQUE[vente.boutique] || {};
const totalPayeRecu = vente.paiements.reduce((s, p) => s + p.montant, 0);
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="print-area rounded-xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FFFDF9", fontFamily: "'IBM Plex Mono', monospace" }}>
        <div className="flex items-center justify-between mb-4 no-print"><p className="font-display font-semibold">Reçu de vente</p><button onClick={onClose}><X size={18} color="#6B5D52" /></button></div>

        <div className="text-center mb-3">
          <p className="font-display font-bold text-sm leading-tight">{infos.nom}</p>
          <p className="font-display font-bold text-sm leading-tight">{infos.ligne2}</p>
          <p className="text-xs mt-1" style={{ color: "#6B5D52" }}>{infos.adresse}</p>
          <p className="text-xs" style={{ color: "#6B5D52" }}>{infos.telephone}</p>
        </div>
        <div style={{ borderTop: "1px dashed #DDD3C4" }} className="my-2" />

        <p className="text-center font-display text-lg font-semibold">{vente.numero}</p>
        <p className="text-center text-xs mb-4" style={{ color: "#6B5D52" }}>{new Date(vente.date).toLocaleString("fr-FR")} · {vente.boutique}</p>
        <div className="text-xs mb-2" style={{ color: "#6B5D52" }}>Vendeur : {vente.vendeur?.prenom} {vente.vendeur?.nom}</div>
        <div className="text-xs mb-2" style={{ color: "#6B5D52" }}>Mode : {vente.modeVente}</div>
        {vente.client && <div className="text-xs mb-3" style={{ color: "#6B5D52" }}>Client : {vente.client.nomPrenoms}</div>}
        <div style={{ borderTop: "1px dashed #DDD3C4", borderBottom: "1px dashed #DDD3C4" }} className="py-3 space-y-1.5">
          {vente.lignes.map((l) => <div key={l.id} className="flex justify-between text-xs"><span>{l.designation}{l.pointure ? ` T${l.pointure}` : ""} ×{l.quantite}</span><span>{fmt(l.sousTotal)} F</span></div>)}
        </div>
        <div className="flex justify-between font-semibold mt-3 text-sm"><span>TOTAL</span><span>{fmt(vente.total)} F</span></div>
{vente.typeVente === "Credit" && (
          <div className="mt-1 space-y-1">
            <div className="flex justify-between text-xs" style={{ color: "#6B5D52" }}><span>Payé</span><span>{fmt(totalPayeRecu)} F</span></div>
            <div className="flex justify-between text-xs font-semibold" style={{ color: "#B04A3B" }}><span>Reste à payer</span><span>{fmt(vente.total - totalPayeRecu)} F</span></div>
          </div>
        )}
        <div className="mt-2 space-y-1">
          {vente.paiements.map((p) => <div key={p.id} className="flex justify-between text-xs" style={{ color: "#6B5D52" }}><span>{MODES_PAIEMENT.find((m) => m.id === p.mode)?.label}</span><span>{fmt(p.montant)} F</span></div>)}
          {vente.monnaieRendue > 0 && <div className="flex justify-between text-xs font-medium" style={{ color: "#3F6B4A" }}><span>Monnaie rendue</span><span>{fmt(vente.monnaieRendue)} F</span></div>}
        </div>

        <div style={{ borderTop: "1px dashed #DDD3C4" }} className="mt-3 pt-3">
          <p className="text-xs text-center whitespace-pre-line leading-relaxed" style={{ color: "#6B5D52" }}>{MESSAGE_FIN_TICKET}</p>
        </div>

        <button onClick={() => window.print()} className="no-print w-full mt-5 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC", fontFamily: "'Inter', sans-serif" }}><Printer size={15} /> Imprimer</button>
      </div>
    </div>
  );
}

function RetoursSection({ ventes, boutique, onDone }) {
  const [numero, setNumero] = useState("");
  const [venteChoisie, setVenteChoisie] = useState(null);
  const [ligneChoisie, setLigneChoisie] = useState("");
  const [type, setType] = useState("Retour");
  const [quantite, setQuantite] = useState(1);
  const [nouvellePointure, setNouvellePointure] = useState("");
  const [motif, setMotif] = useState("");
  const [error, setError] = useState("");
  const [succes, setSucces] = useState("");

  const resultats = numero.trim() ? ventes.filter((v) => v.numero.toLowerCase().includes(numero.toLowerCase())) : [];
  const ligne = venteChoisie?.lignes.find((l) => l.id === ligneChoisie);

  const submit = async () => {
    if (!venteChoisie || !ligneChoisie) { setError("Choisis la vente et la ligne concernée."); return; }
    try {
      await api.retours.create({ venteId: venteChoisie.id, ligneVenteId: ligneChoisie, type, quantite: Number(quantite), nouvellePointure: type === "Echange" ? nouvellePointure : undefined, motif, boutique });
      setSucces("Retour enregistré et stock mis à jour.");
      setError("");
      setVenteChoisie(null); setLigneChoisie(""); setNumero(""); setMotif(""); setQuantite(1); setNouvellePointure("");
      onDone();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="max-w-lg">
      {succes && <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "#E9F0EA", color: "#3F6B4A" }}>{succes}</p>}
      {error && <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "#FBEAE7", color: "#8C3B2E" }}>{error}</p>}

      <Field label="Numéro de reçu">
        <input value={numero} onChange={(e) => { setNumero(e.target.value); setVenteChoisie(null); }} style={inputStyle} placeholder="REC-000123" />
      </Field>
      {resultats.length > 0 && !venteChoisie && (
        <div className="mt-2 rounded-lg overflow-hidden" style={{ border: "1px solid #DDD3C4" }}>
          {resultats.slice(0, 5).map((v) => (
            <button key={v.id} onClick={() => setVenteChoisie(v)} className="w-full text-left px-3 py-2 text-sm" style={{ background: "#FFFFFF" }}>{v.numero} — {fmt(v.total)} F ({v.boutique})</button>
          ))}
        </div>
      )}

      {venteChoisie && (
        <>
          <Field label="Article concerné">
            <select value={ligneChoisie} onChange={(e) => setLigneChoisie(e.target.value)} style={inputStyle}>
              <option value="">— Choisir —</option>
              {venteChoisie.lignes.map((l) => <option key={l.id} value={l.id}>{l.designation}{l.pointure ? ` T${l.pointure}` : ""} (×{l.quantite})</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}><option>Retour</option><option>Echange</option></select></Field>
            <Field label="Quantité"><input type="number" min="1" max={ligne?.quantite || 1} value={quantite} onChange={(e) => setQuantite(e.target.value)} style={inputStyle} /></Field>
          </div>
          {type === "Echange" && (
            <Field label="Nouvelle pointure">
              <select value={nouvellePointure} onChange={(e) => setNouvellePointure(e.target.value)} style={inputStyle}>
                <option value="">— Choisir —</option>{POINTURES.map((p) => <option key={p} value={p}>T{p}</option>)}
              </select>
            </Field>
          )}
          <Field label="Motif (optionnel)"><input value={motif} onChange={(e) => setMotif(e.target.value)} style={inputStyle} /></Field>
          <button onClick={submit} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}><RotateCcw size={15} /> Enregistrer le {type === "Retour" ? "retour" : "échange"}</button>
        </>
      )}
    </div>
  );
}

function CartesCadeauxSection() {
  const [cartes, setCartes] = useState([]);
  const [numero, setNumero] = useState("");
  const [montant, setMontant] = useState("");
  const [dateExpiration, setDateExpiration] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => { try { setCartes(await api.cartesCadeaux.list()); } catch (e) { setError(e.message); } }, []);
  useEffect(() => { load(); }, [load]);

  const creer = async () => {
    if (!numero.trim() || !montant) { setError("Numéro et montant sont obligatoires."); return; }
    try {
      await api.cartesCadeaux.create({ numero: numero.trim(), montant: Number(montant), dateExpiration: dateExpiration || undefined });
      setNumero(""); setMontant(""); setDateExpiration(""); setError(""); load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      {error && <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "#FBEAE7", color: "#8C3B2E" }}>{error}</p>}
      <div className="rounded-xl p-5 mb-6 max-w-md" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
        <p className="font-display font-semibold mb-3 flex items-center gap-2"><Gift size={16} /> Nouvelle carte cadeau</p>
        <Field label="Numéro (manuel)"><input value={numero} onChange={(e) => setNumero(e.target.value)} style={inputStyle} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant (F CFA)"><input value={montant} onChange={(e) => setMontant(e.target.value.replace(/\D/g, ""))} style={inputStyle} /></Field>
          <Field label="Expiration (optionnel)"><input type="date" value={dateExpiration} onChange={(e) => setDateExpiration(e.target.value)} style={inputStyle} /></Field>
        </div>
        <button onClick={creer} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}><Plus size={16} /> Créer la carte</button>
      </div>

      <div className="space-y-2">
        {cartes.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <div><p className="font-mono text-sm font-medium">{c.numero}</p><p className="text-xs" style={{ color: "#6B5D52" }}>{c.dateExpiration ? `Expire le ${new Date(c.dateExpiration).toLocaleDateString("fr-FR")}` : "Sans expiration"}</p></div>
            <div className="text-right">
              <p className="font-mono text-sm">{fmt(c.montant)} F</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.utilisee ? "#FBEAE7" : "#E9F0EA", color: c.utilisee ? "#B04A3B" : "#3F6B4A" }}>{c.utilisee ? "Utilisée" : "Disponible"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
function CreditSection({ ventesCredit, onDone }) {
  const [venteSel, setVenteSel] = useState(null);
  const [mode, setMode] = useState("especes");
  const [montant, setMontant] = useState("");
  const [carteNumero, setCarteNumero] = useState("");
  const [error, setError] = useState("");
  const [succes, setSucces] = useState("");

  const nonSoldees = ventesCredit.filter((v) => v.resteAPayer > 0);
  const soldees = ventesCredit.filter((v) => v.resteAPayer <= 0);

  const ouvrirReglement = (v) => {
    setVenteSel(v);
    setMontant(v.resteAPayer);
    setMode("especes");
    setCarteNumero("");
    setError("");
    setSucces("");
  };

  const enregistrerReglement = async () => {
    if (!montant || Number(montant) <= 0) { setError("Le montant doit être positif."); return; }
    try {
      await api.ventes.reglement(venteSel.id, {
        mode, montant: Number(montant), carteNumero: mode === "bon_achat" ? carteNumero : undefined,
      });
      setSucces("Règlement enregistré.");
      setVenteSel(null);
      onDone();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      {succes && <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "#E9F0EA", color: "#3F6B4A" }}>{succes}</p>}

      <p className="font-display font-semibold mb-3">Non soldées ({nonSoldees.length})</p>
      <div className="space-y-2 mb-6">
        {nonSoldees.length === 0 && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucune vente à crédit en attente de règlement.</p>}
        {nonSoldees.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-xl p-4 flex-wrap gap-2" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <div>
              <p className="font-mono text-sm font-medium">{v.numero}</p>
              <p className="text-xs" style={{ color: "#6B5D52" }}>{v.client?.nomPrenoms || "Client inconnu"} · {new Date(v.date).toLocaleDateString("fr-FR")} · {v.boutique}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs" style={{ color: "#6B5D52" }}>Total {fmt(v.total)} F · Payé {fmt(v.totalPaye)} F</p>
                <p className="text-sm font-semibold" style={{ color: "#B04A3B" }}>Reste {fmt(v.resteAPayer)} F</p>
              </div>
              <button onClick={() => ouvrirReglement(v)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Enregistrer un règlement</button>
            </div>
          </div>
        ))}
      </div>

      <p className="font-display font-semibold mb-3">Soldées ({soldees.length})</p>
      <div className="space-y-2">
        {soldees.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-xl p-4 flex-wrap gap-2" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <div>
              <p className="font-mono text-sm font-medium">{v.numero}</p>
              <p className="text-xs" style={{ color: "#6B5D52" }}>{v.client?.nomPrenoms || "Client inconnu"} · {new Date(v.date).toLocaleDateString("fr-FR")} · {v.boutique}</p>
            </div>
            <p className="text-sm font-semibold" style={{ color: "#3F6B4A" }}>Soldée · {fmt(v.total)} F</p>
          </div>
        ))}
      </div>

      {venteSel && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
          <div className="rounded-xl p-6 max-w-sm w-full" style={{ background: "#FFFDF9" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-semibold">Règlement — {venteSel.numero}</p>
              <button onClick={() => setVenteSel(null)}><X size={18} color="#6B5D52" /></button>
            </div>
            {error && <p className="text-sm mb-3 px-3 py-2 rounded-lg" style={{ background: "#FBEAE7", color: "#8C3B2E" }}>{error}</p>}
            <p className="text-xs mb-3" style={{ color: "#6B5D52" }}>Reste à payer : {fmt(venteSel.resteAPayer)} F</p>
            <Field label="Mode de paiement">
              <select value={mode} onChange={(e) => setMode(e.target.value)} style={inputStyle}>
                {MODES_PAIEMENT.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Montant (F CFA)">
              <input type="number" min="0" max={venteSel.resteAPayer} value={montant} onChange={(e) => setMontant(e.target.value)} style={inputStyle} />
            </Field>
            {mode === "bon_achat" && (
              <Field label="Numéro de la carte cadeau">
                <input value={carteNumero} onChange={(e) => setCarteNumero(e.target.value)} style={inputStyle} />
              </Field>
            )}
            <button onClick={enregistrerReglement} className="mt-4 w-full px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: "#3F6B4A", color: "#F3F7F3" }}>Valider le règlement</button>
          </div>
        </div>
      )}
    </div>
  );
}