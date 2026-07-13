import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, X, ShoppingCart, Printer, Wallet, Search, Minus, PauseCircle, PlayCircle, RotateCcw, Gift, Percent, Clock, CheckCircle2, XCircle } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { BOUTIQUES, POINTURES, MODES_VENTE, MODES_PAIEMENT, INFOS_BOUTIQUE, MESSAGE_FIN_TICKET, fmt } from "../constants.js";
import { Field, ErrorBanner, inputStyle } from "../components/Shared.jsx";

function uid() { return `tmp_${Date.now()}_${Math.floor(Math.random() * 10000)}`; }

export default function VentesSection() {
  const { user } = useAuth();
  const estAdmin = !!user?.role?.systeme;
  const [subTab, setSubTab] = useState("nouvelle");
  const [articles, setArticles] = useState([]);
  const [brands, setBrands] = useState([]);
  const [clients, setClients] = useState([]);
  const [ventes, setVentes] = useState([]);
  const [attentes, setAttentes] = useState([]);
  const [ventesCredit, setVentesCredit] = useState([]);
  const [vendeurs, setVendeurs] = useState([]);
  const [vendeurId, setVendeurId] = useState("");
  const [demandeRemise, setDemandeRemise] = useState(null);
  const [historiqueSearch, setHistoriqueSearch] = useState("");
  const [venteAAnnuler, setVenteAAnnuler] = useState(null);
  const [motifAnnulation, setMotifAnnulation] = useState("");
  const [annulationChargement, setAnnulationChargement] = useState(false);
  const [remiseFormOuvert, setRemiseFormOuvert] = useState(false);
  const [remiseType, setRemiseType] = useState("MONTANT");
  const [remiseValeur, setRemiseValeur] = useState("");
  const [remiseChargement, setRemiseChargement] = useState(false);
  const [nbRemisesEnAttente, setNbRemisesEnAttente] = useState(0);
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
  const [articleSearch, setArticleSearch] = useState("");
  const [selPointure, setSelPointure] = useState("");
  const [selQty, setSelQty] = useState(1);

  const brandName = (id) => brands.find((b) => b.id === id)?.nom || "—";

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b, c, v, at, vc, vd] = await Promise.all([
        api.articles.list(), api.brands.list(), api.clients.list(),
        api.ventes.list({ boutique }), api.ventesAttente.list(boutique), api.ventes.creditListe({ boutique }),
        api.vendeurs.list(boutique),
      ]);
      setArticles(a); setBrands(b); setClients(c); setVentes(v); setAttentes(at); setVentesCredit(vc);
      setVendeurs(vd);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, [boutique]);
  useEffect(() => { load(); }, [load]);

  useEffect(() => { setVendeurId(""); }, [boutique]);

  useEffect(() => {
    const dernierClientId = localStorage.getItem("gc_dernier_client_id");
    if (dernierClientId && clients.some((c) => c.id === dernierClientId)) {
      setClientId(dernierClientId);
      localStorage.removeItem("gc_dernier_client_id");
    }
  }, [clients]);

  useEffect(() => {
    if (!demandeRemise || demandeRemise.statut !== "EN_ATTENTE") return;
    const interval = setInterval(async () => {
      try {
        const maj = await api.remises.get(demandeRemise.id);
        if (maj.statut !== "EN_ATTENTE") setDemandeRemise(maj);
      } catch { /* erreur reseau ponctuelle */ }
    }, 4000);
    return () => clearInterval(interval);
  }, [demandeRemise]);

  useEffect(() => {
    if (!estAdmin) return;
    const rafraichir = async () => {
      try { setNbRemisesEnAttente((await api.remises.list("EN_ATTENTE")).length); } catch { /* ignore */ }
    };
    rafraichir();
    const interval = setInterval(rafraichir, 5000);
    return () => clearInterval(interval);
  }, [estAdmin]);

  const currentArticle = articles.find((a) => a.id === selArticle);
  const disponibilite = (article, b, pointure) => {
    if (!article) return 0;
    const item = article.stocks?.find((s) => s.boutique === b && s.pointure === (pointure || ""));
    return item?.quantite || 0;
  };
  const articleADuStock = (article, b) => {
    if (article.famille === "Chaussure") return POINTURES.some((p) => disponibilite(article, b, p) > 0);
    return disponibilite(article, b) > 0;
  };

  const total = lignes.reduce((s, l) => s + l.sousTotal, 0);

  useEffect(() => {
    if (demandeRemise && demandeRemise.totalVente !== total) {
      setDemandeRemise(null);
      setError("Le panier a change depuis la demande de remise : elle a ete annulee. Refais une demande si besoin.");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [total]);

  const montantRemiseApplique = demandeRemise?.statut === "APPROUVEE" ? demandeRemise.montantRemise : 0;
  const totalNet = total - montantRemiseApplique;
  const totalPaye = paiements.reduce((s, p) => s + (Number(p.montant) || 0), 0);
  const reste = totalNet - totalPaye;

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

  const resetVente = () => {
    setLignes([]); setPaiements([]); setClientId(""); setClientSearch(""); setModeVente(MODES_VENTE[0]);
    setVendeurId(""); setDemandeRemise(null); setRemiseFormOuvert(false); setRemiseValeur("");
  };

  const demanderRemise = async () => {
    if (!remiseValeur || Number(remiseValeur) <= 0) { setError("Indique une valeur de remise valide."); return; }
    if (remiseType === "POURCENTAGE" && Number(remiseValeur) > 100) { setError("Un pourcentage ne peut pas depasser 100."); return; }
    setRemiseChargement(true);
    try {
      const clientSel = clients.find((c) => c.id === clientId);
      const demande = await api.remises.create({
        totalVente: total, type: remiseType, valeur: Number(remiseValeur),
        clientNom: clientSel ? clientSel.nomPrenoms : undefined,
      });
      setDemandeRemise(demande);
      setRemiseFormOuvert(false);
      setRemiseValeur("");
      setError("");
    } catch (e) { setError(e.message); } finally { setRemiseChargement(false); }
  };

  const validerVente = async () => {
    if (lignes.length === 0) { setError("Ajoute au moins un article a la vente."); return; }
    if (!vendeurId) { setError("Choisis le vendeur qui a realise cette vente."); return; }
    if (typeVente === "Credit" && !clientId) { setError("Un client est obligatoire pour une vente a credit."); return; }
    if (typeVente === "Comptant" && totalPaye < totalNet) { setError("Le total paye est inferieur au total de la vente."); return; }
    try {
      const vente = await api.ventes.create({
        boutique, vendeurId, modeVente, typeVente, clientId: clientId || null,
        demandeRemiseId: demandeRemise?.statut === "APPROUVEE" ? demandeRemise.id : undefined,
        lignes: lignes.map(({ articleId, pointure, quantite }) => ({ articleId, pointure, quantite })),
        paiements: paiements.map((p) => ({ mode: p.mode, montant: Number(p.montant), carteNumero: (p.mode === "bon_achat" || p.mode === "avoir") ? p.carteNumero : undefined })),
      });
      setReceipt(vente);
      resetVente();
      setError("");
      load();
    } catch (e) { setError(e.message); }
  };

  const mettreEnAttente = async () => {
    if (lignes.length === 0) { setError("Le panier est vide."); return; }
    if (!vendeurId) { setError("Choisis le vendeur qui a realise cette vente."); return; }
    try {
      const clientSel = clients.find((c) => c.id === clientId);
      await api.ventesAttente.create({
        boutique, vendeurId, clientId: clientId || null, modeVente,
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
    setVendeurId(ticket.vendeurId || "");
    try { await api.ventesAttente.remove(ticket.id); } catch { /* deja supprime, tant pis */ }
    setSubTab("nouvelle");
    load();
  };

  const annulerAttente = async (ticket) => {
    try { await api.ventesAttente.remove(ticket.id); load(); } catch (e) { setError(e.message); }
  };

  const annulerVente = async () => {
    if (!motifAnnulation.trim()) { setError("Le motif d'annulation est obligatoire."); return; }
    setAnnulationChargement(true);
    try {
      await api.ventes.annuler(venteAAnnuler.id, { motif: motifAnnulation.trim() });
      setVenteAAnnuler(null);
      setMotifAnnulation("");
      setError("");
      load();
    } catch (e) { setError(e.message); } finally { setAnnulationChargement(false); }
  };

  return (
    <div>
      <ErrorBanner error={error} onClose={() => setError("")} />

      <div className="flex gap-6 items-start">
        <div className="flex flex-col gap-2 no-print shrink-0" style={{ width: "200px" }}>
          {[["nouvelle", "Nouvelle vente"], ["attente", `En attente (${attentes.length})`], ["credit", `Ventes a credit (${ventesCredit.length})`], ["historique", "Historique"], ["retours", "Retours / Echanges"], ["cartes", "Cartes cadeaux"], ["avoirs", "Avoirs"],
            ...(estAdmin ? [["remises-admin", `Demandes de remise${nbRemisesEnAttente > 0 ? ` (${nbRemisesEnAttente})` : ""}`]] : [])].map(([id, label]) => (
            <button key={id} onClick={() => setSubTab(id)} className="px-4 py-2 rounded-lg text-sm font-medium text-left" style={subTab === id ? { background: "#8C3B2E", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>{label}</button>
          ))}
        </div>

        <div className="flex-1 min-w-0">
        {subTab === "nouvelle" && (        <div className="grid lg:grid-cols-5 gap-6">
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
                <Field label="Vendeur">
                  <select value={vendeurId} onChange={(e) => setVendeurId(e.target.value)} style={inputStyle}>
                    <option value="">— Choisir —</option>
                    {vendeurs.filter((v) => v.actif !== false).map((v) => <option key={v.id} value={v.id}>{v.nom}</option>)}
                  </select>
                </Field>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Mode de vente"><select value={modeVente} onChange={(e) => setModeVente(e.target.value)} style={inputStyle}>{MODES_VENTE.map((m) => <option key={m}>{m}</option>)}</select></Field>
<Field label="Type de vente">
                  <div className="flex gap-2 mt-1">
                    <button type="button" onClick={() => setTypeVente("Comptant")} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium" style={typeVente === "Comptant" ? { background: "#8C3B2E", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>Comptant</button>
                    <button type="button" onClick={() => setTypeVente("Credit")} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium" style={typeVente === "Credit" ? { background: "#8C3B2E", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>Credit</button>
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
                  {selArticle ? (
                    <div className="flex items-center justify-between mt-1 px-3 py-2 rounded-lg" style={{ background: "#F1E9DC" }}>
                      <span className="text-sm">{currentArticle?.designation} · {brandName(currentArticle?.marqueId)}</span>
                      <button onClick={() => { setSelArticle(""); setArticleSearch(""); setSelPointure(""); }} style={{ color: "#B04A3B" }}><X size={14} /></button>
                    </div>
                  ) : (
                    <div className="relative mt-1">
                      <input value={articleSearch} onChange={(e) => setArticleSearch(e.target.value)} style={{ ...inputStyle, marginTop: 0, paddingLeft: "30px" }} placeholder="Rechercher un article…" />
                      <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color="#6B5D52" />
                      {articleSearch.trim() && (
                        <div className="absolute z-10 w-full bottom-full mb-1 rounded-lg overflow-hidden max-h-48 overflow-y-auto" style={{ background: "#FFFFFF", border: "1px solid #DDD3C4", boxShadow: "0 -4px 12px rgba(0,0,0,0.1)" }}>
                          {articles.filter((a) => a.actif !== false && articleADuStock(a, boutique) && (a.designation.toLowerCase().includes(articleSearch.toLowerCase()) || brandName(a.marqueId).toLowerCase().includes(articleSearch.toLowerCase()))).slice(0, 20).map((a) => (
                            <button key={a.id} onClick={() => { setSelArticle(a.id); setArticleSearch(""); setSelPointure(""); }} className="w-full text-left px-3 py-2 text-sm" style={{ background: "#FFFFFF" }}>
                              {a.designation} · {brandName(a.marqueId)}
                            </button>
                          ))}
                          {articles.filter((a) => a.actif !== false && articleADuStock(a, boutique) && (a.designation.toLowerCase().includes(articleSearch.toLowerCase()) || brandName(a.marqueId).toLowerCase().includes(articleSearch.toLowerCase()))).length === 0 && (
                            <div className="px-3 py-2 text-sm" style={{ color: "#6B5D52" }}>Aucun article trouvé.</div>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </Field>
                {currentArticle?.famille === "Chaussure" ? (
                  <Field label="Pointure">
                    <select value={selPointure} onChange={(e) => setSelPointure(e.target.value)} style={inputStyle}>
                      <option value="">— Choisir —</option>
                      {POINTURES.filter((p) => disponibilite(currentArticle, boutique, p) > 0).map((p) => { const dispo = disponibilite(currentArticle, boutique, p); return <option key={p} value={p}>T{p} ({dispo} dispo.)</option>; })}
                    </select>
                  </Field>
                 ) : (
                  <Field label="Disponible"><div style={{ ...inputStyle, background: "#F1E9DC", color: "#6B5D52" }}>{currentArticle ? `${disponibilite(currentArticle, boutique)} en stock` : "—"}</div></Field>
                )}
                <Field label="Quantite"><input type="number" min="1" value={selQty} onChange={(e) => setSelQty(e.target.value)} style={inputStyle} /></Field>
              </div>
              <button onClick={addLigne} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}><Plus size={16} /> Ajouter au panier</button>
            </div>
          </div>

          <div className="lg:col-span-2">
            <div className="rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
              <p className="font-display font-semibold mb-3 flex items-center gap-2"><ShoppingCart size={16} /> Panier</p>
              {lignes.length === 0 && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucun article ajoute.</p>}
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

              <div className="mt-3 pt-3" style={{ borderTop: "1px solid #EFE7D9" }}>
                {!demandeRemise && !remiseFormOuvert && (
                  <button onClick={() => setRemiseFormOuvert(true)} className="flex items-center gap-1.5 text-xs font-medium" style={{ color: "#8C3B2E" }}>
                    <Percent size={13} /> Demander une remise
                  </button>
                )}
                {!demandeRemise && remiseFormOuvert && (
                  <div className="rounded-lg p-3" style={{ background: "#F1E9DC" }}>
                    <div className="flex gap-2 mb-2">
                      <button type="button" onClick={() => setRemiseType("MONTANT")} className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium" style={remiseType === "MONTANT" ? { background: "#8C3B2E", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>Montant (F)</button>
                      <button type="button" onClick={() => setRemiseType("POURCENTAGE")} className="flex-1 px-2 py-1.5 rounded-lg text-xs font-medium" style={remiseType === "POURCENTAGE" ? { background: "#8C3B2E", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>Pourcentage (%)</button>
                    </div>
                    <input type="number" min="0" value={remiseValeur} onChange={(e) => setRemiseValeur(e.target.value)} placeholder={remiseType === "MONTANT" ? "Ex : 5000" : "Ex : 10"} style={{ ...inputStyle, marginTop: 0 }} />
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => { setRemiseFormOuvert(false); setRemiseValeur(""); }} className="flex-1 px-3 py-1.5 rounded-lg text-xs" style={{ color: "#6B5D52" }}>Annuler</button>
                      <button onClick={demanderRemise} disabled={remiseChargement} className="flex-1 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>{remiseChargement ? "Envoi..." : "Envoyer a Djenie"}</button>
                    </div>
                  </div>
                )}
                {demandeRemise?.statut === "EN_ATTENTE" && (
                  <div className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: "#F1E9DC", color: "#6B5D52" }}>
                    <Clock size={13} /> En attente de validation par Djenie ({demandeRemise.numero})…
                  </div>
                )}
                {demandeRemise?.statut === "APPROUVEE" && (
                  <div className="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: "#E9F0EA", color: "#3F6B4A" }}>
                    <span className="flex items-center gap-1.5"><CheckCircle2 size={13} /> Remise approuvee : - {fmt(demandeRemise.montantRemise)} F</span>
                    <button onClick={() => setDemandeRemise(null)} style={{ color: "#B04A3B" }}><X size={13} /></button>
                  </div>
                )}
                {demandeRemise?.statut === "REFUSEE" && (
                  <div className="flex items-center justify-between gap-2 text-xs px-3 py-2 rounded-lg" style={{ background: "#FBEAE7", color: "#8C3B2E" }}>
                    <span className="flex items-center gap-1.5"><XCircle size={13} /> Remise refusee par Djenie</span>
                    <button onClick={() => setDemandeRemise(null)} style={{ color: "#8C3B2E" }}><X size={13} /></button>
                  </div>
                )}
                {montantRemiseApplique > 0 && (
                  <div className="flex items-center justify-between mt-2 text-sm font-semibold">
                    <span style={{ color: "#6B5D52" }}>Net a payer</span><span style={{ color: "#3F6B4A" }}>{fmt(totalNet)} F</span>
                  </div>
                )}
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
                      {(p.mode === "bon_achat" || p.mode === "avoir") && (
                        <input value={p.carteNumero} onChange={(e) => updatePaiement(p.id, { carteNumero: e.target.value })} placeholder={p.mode === "avoir" ? "Numero de l'avoir" : "Numero de la carte cadeau"} style={{ ...inputStyle, marginTop: "6px" }} />
                      )}
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between mt-3 text-sm"><span style={{ color: "#6B5D52" }}>Paye</span><span className="font-mono">{fmt(totalPaye)} F</span></div>
              <div className="flex items-center justify-between text-sm"><span style={{ color: reste > 0 ? "#B04A3B" : "#3F6B4A" }}>{reste > 0 ? "Reste a payer" : "Monnaie a rendre"}</span><span className="font-mono" style={{ color: reste > 0 ? "#B04A3B" : "#3F6B4A" }}>{fmt(Math.abs(reste))} F</span></div>
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
        <div>
          <div className="relative mb-4 max-w-md">
            <input value={historiqueSearch} onChange={(e) => setHistoriqueSearch(e.target.value)} placeholder="Rechercher par n° de reçu ou nom du client…" style={{ ...inputStyle, marginTop: 0, paddingLeft: "32px" }} />
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color="#6B5D52" />
          </div>
          <div className="space-y-3">
            {ventes.filter((v) => {
              if (!historiqueSearch.trim()) return true;
              const q = historiqueSearch.trim().toLowerCase();
              return v.numero.toLowerCase().includes(q) || (v.client?.nomPrenoms || "").toLowerCase().includes(q);
            }).map((v) => (
              <div key={v.id} className="rounded-xl p-4 flex items-center justify-between flex-wrap gap-2 cursor-pointer card-hover" style={{ background: v.statut === "Annulee" ? "#FBEAE7" : "#FFFFFF", border: "1px solid #EAE1D2", opacity: v.statut === "Annulee" ? 0.7 : 1 }} onClick={() => setReceipt(v)}>
                <div>
                  <p className="font-mono text-sm font-medium">
                    {v.numero}{v.client ? ` · ${v.client.nomPrenoms}` : ""}
                    {v.statut === "Annulee" && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>ANNULÉE</span>}
                  </p>
                  <p className="text-xs" style={{ color: "#6B5D52" }}>{new Date(v.date).toLocaleString("fr-FR")} · {v.boutique} · Vendeur : {v.vendeur?.nom} · {v.modeVente}{v.montantRemise > 0 ? " · Remise appliquée" : ""}</p>
                  {v.statut === "Annulee" && <p className="text-xs mt-1" style={{ color: "#8C3B2E" }}>Motif : {v.motifAnnulation} · par {v.annuleePar?.prenom} {v.annuleePar?.nom}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <p className="font-display font-semibold" style={{ color: "#8C3B2E", textDecoration: v.statut === "Annulee" ? "line-through" : "none" }}>{fmt(v.total)} F</p>
                  {v.statut !== "Annulee" && (
                    <button onClick={(e) => { e.stopPropagation(); setVenteAAnnuler(v); setMotifAnnulation(""); setError(""); }} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: "1px solid #DDD3C4", color: "#B04A3B" }}>Annuler</button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {subTab === "retours" && <RetoursSection ventes={ventes} boutique={boutique} onDone={load} />}
      {subTab === "cartes" && <CartesCadeauxSection />}
      {subTab === "avoirs" && <AvoirsSection />}
      {subTab === "credit" && <CreditSection ventesCredit={ventesCredit} onDone={load} />}
      {subTab === "remises-admin" && estAdmin && <RemisesAdminSection onTraite={() => setNbRemisesEnAttente((n) => Math.max(0, n - 1))} />}
        </div>
      </div>

      {receipt && <ReceiptModal vente={receipt} onClose={() => setReceipt(null)} />}

      {venteAAnnuler && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
          <div className="rounded-xl p-6 max-w-sm w-full" style={{ background: "#FFFDF9" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-semibold">Annuler {venteAAnnuler.numero}</p>
              <button onClick={() => setVenteAAnnuler(null)}><X size={18} color="#6B5D52" /></button>
            </div>
            <p className="text-sm mb-3" style={{ color: "#6B5D52" }}>
              Cette vente sera marquée annulée, le stock sera remis, et le total sera exclu du chiffre d'affaires du jour. Cette action est tracée avec ton nom.
            </p>
            <Field label="Motif de l'annulation">
              <textarea value={motifAnnulation} onChange={(e) => setMotifAnnulation(e.target.value)} style={{ ...inputStyle, minHeight: "70px" }} placeholder="Ex : erreur de saisie, client absent, mauvais article…" />
            </Field>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setVenteAAnnuler(null)} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium" style={{ border: "1px solid #DDD3C4", color: "#6B5D52" }}>Retour</button>
              <button onClick={annulerVente} disabled={annulationChargement} className="flex-1 px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: "#B04A3B", color: "#FBF3EC" }}>{annulationChargement ? "Annulation..." : "Confirmer l'annulation"}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function ReceiptModal({ vente, onClose }) {
  const infos = INFOS_BOUTIQUE[vente.boutique] || {};
const totalPayeRecu = vente.paiements.reduce((s, p) => s + p.montant, 0);
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="print-area rounded-xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FFFDF9", fontFamily: "'IBM Plex Mono', monospace" }}>
        <div className="flex items-center justify-between mb-4 no-print"><p className="font-display font-semibold">Recu de vente</p><button onClick={onClose}><X size={18} color="#6B5D52" /></button></div>

        <div className="text-center mb-3">
          <p className="font-display font-bold text-sm leading-tight">{infos.nom}</p>
          <p className="font-display font-bold text-sm leading-tight">{infos.ligne2}</p>
          <p className="text-xs mt-1" style={{ color: "#6B5D52" }}>{infos.adresse}</p>
          <p className="text-xs" style={{ color: "#6B5D52" }}>{infos.telephone}</p>
        </div>
        <div style={{ borderTop: "1px dashed #DDD3C4" }} className="my-2" />

        <p className="text-center font-display text-lg font-semibold">{vente.numero}</p>
        <p className="text-center text-xs mb-4" style={{ color: "#6B5D52" }}>{new Date(vente.date).toLocaleString("fr-FR")} · {vente.boutique}</p>
        <div className="text-xs mb-2" style={{ color: "#6B5D52" }}>Vendeur : {vente.vendeur?.nom}</div>
        <div className="text-xs mb-2" style={{ color: "#6B5D52" }}>Caissier : {vente.caissier?.prenom} {vente.caissier?.nom}</div>
        <div className="text-xs mb-2" style={{ color: "#6B5D52" }}>Mode : {vente.modeVente}</div>
        {vente.client && <div className="text-xs mb-3" style={{ color: "#6B5D52" }}>Client : {vente.client.nomPrenoms}</div>}
        <div style={{ borderTop: "1px dashed #DDD3C4", borderBottom: "1px dashed #DDD3C4" }} className="py-3 space-y-1.5">
          {vente.lignes.map((l) => <div key={l.id} className="flex justify-between text-xs"><span>{l.designation}{l.pointure ? ` T${l.pointure}` : ""} ×{l.quantite}</span><span>{fmt(l.sousTotal)} F</span></div>)}
        </div>
        {vente.montantRemise > 0 ? (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs" style={{ color: "#6B5D52" }}><span>Sous-total</span><span>{fmt(vente.total + vente.montantRemise)} F</span></div>
            <div className="flex justify-between text-xs font-medium" style={{ color: "#3F6B4A" }}><span>Remise accordee</span><span>- {fmt(vente.montantRemise)} F</span></div>
            <div className="flex justify-between font-semibold text-sm"><span>NET A PAYER</span><span>{fmt(vente.total)} F</span></div>
          </div>
        ) : (
          <div className="flex justify-between font-semibold mt-3 text-sm"><span>TOTAL</span><span>{fmt(vente.total)} F</span></div>
        )}
{vente.typeVente === "Credit" && (
          <div className="mt-1 space-y-1">
            <div className="flex justify-between text-xs" style={{ color: "#6B5D52" }}><span>Paye</span><span>{fmt(totalPayeRecu)} F</span></div>
            <div className="flex justify-between text-xs font-semibold" style={{ color: "#B04A3B" }}><span>Reste a payer</span><span>{fmt(vente.total - totalPayeRecu)} F</span></div>
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

function RemisesAdminSection({ onTraite }) {
  const [demandes, setDemandes] = useState([]);
  const [error, setError] = useState("");
  const [traitementId, setTraitementId] = useState(null);

  const load = useCallback(async () => {
    try { setDemandes(await api.remises.list("EN_ATTENTE")); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  const traiter = async (demande, statut) => {
    setTraitementId(demande.id);
    try {
      await api.remises.traiter(demande.id, statut);
      setDemandes((d) => d.filter((x) => x.id !== demande.id));
      onTraite?.();
    } catch (e) { setError(e.message); } finally { setTraitementId(null); }
  };

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: "#6B5D52" }}>Cette liste se met a jour automatiquement toutes les 5 secondes.</p>
      {error && <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "#FBEAE7", color: "#8C3B2E" }}>{error}</p>}
      {demandes.length === 0 && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucune demande en attente pour le moment.</p>}
      <div className="space-y-3">
        {demandes.map((d) => (
          <div key={d.id} className="rounded-xl p-4 flex items-center justify-between flex-wrap gap-3" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <div>
              <p className="font-mono text-sm font-medium">{d.numero} · {d.boutique}</p>
              <p className="text-xs" style={{ color: "#6B5D52" }}>
                Demandee par {d.demandePar?.prenom} {d.demandePar?.nom}{d.clientNom ? ` · Client : ${d.clientNom}` : ""}
              </p>
              <p className="text-xs mt-1" style={{ color: "#6B5D52" }}>
                Panier {fmt(d.totalVente)} F · Remise demandee : {d.type === "POURCENTAGE" ? `${d.valeur}%` : `${fmt(d.valeur)} F`} → <strong style={{ color: "#8C3B2E" }}>-{fmt(d.montantRemise)} F</strong>
              </p>
            </div>
            <div className="flex gap-2">
              <button onClick={() => traiter(d, "REFUSEE")} disabled={traitementId === d.id} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: "1px solid #DDD3C4", color: "#B04A3B" }}>Refuser</button>
              <button onClick={() => traiter(d, "APPROUVEE")} disabled={traitementId === d.id} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#3F6B4A", color: "#F3F7F3" }}>Approuver</button>
            </div>
          </div>
        ))}
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
  const [montantRembourse, setMontantRembourse] = useState("");
  const [dateValiditeAvoir, setDateValiditeAvoir] = useState("");
  const [error, setError] = useState("");
  const [succes, setSucces] = useState("");
  const [avoirGenere, setAvoirGenere] = useState(null);
  const [avoirClientNom, setAvoirClientNom] = useState("");
  const [avoirReceipt, setAvoirReceipt] = useState(null);

  const resultats = numero.trim() ? ventes.filter((v) => v.numero.toLowerCase().includes(numero.toLowerCase())) : [];
  const ligne = venteChoisie?.lignes.find((l) => l.id === ligneChoisie);

  useEffect(() => {
    if (type === "Retour" && ligne) {
      setMontantRembourse(String(ligne.prixUnitaire * Math.max(1, parseInt(quantite, 10) || 1)));
    }
  }, [type, ligne, quantite]);

  const submit = async () => {
    if (!venteChoisie || !ligneChoisie) { setError("Choisis la vente et la ligne concernee."); return; }
    if (type === "Retour") {
      if (!venteChoisie.clientId) { setError("Un client doit etre associe a cette vente pour generer un avoir. Ajoute d'abord le client sur la vente."); return; }
      if (!montantRembourse) { setError("Le montant de l'avoir est obligatoire."); return; }
      if (!dateValiditeAvoir) { setError("La date de validite de l'avoir est obligatoire."); return; }
    }
    const clientNomAvantReset = venteChoisie.client?.nomPrenoms || "";
    try {
      const retourCree = await api.retours.create({
        venteId: venteChoisie.id, ligneVenteId: ligneChoisie, type, quantite: Number(quantite),
        nouvellePointure: type === "Echange" ? nouvellePointure : undefined, motif, boutique,
        montantRembourse: type === "Retour" ? Number(montantRembourse) : undefined,
        dateValiditeAvoir: type === "Retour" ? dateValiditeAvoir : undefined,
      });
      if (type === "Retour" && retourCree.bonValeurGenere) {
        setAvoirGenere(retourCree.bonValeurGenere);
        setAvoirClientNom(clientNomAvantReset);
        setSucces("");
      } else {
        setSucces("Echange enregistre et stock mis a jour.");
        setAvoirGenere(null);
      }
      setError("");
      setVenteChoisie(null); setLigneChoisie(""); setNumero(""); setMotif(""); setQuantite(1); setNouvellePointure("");
      setMontantRembourse(""); setDateValiditeAvoir("");
      onDone();
    } catch (e) { setError(e.message); }
  };

  return (
    <div className="max-w-lg">
      {avoirGenere && (
        <div className="mb-4 px-4 py-3 rounded-lg" style={{ background: "#E9F0EA", color: "#3F6B4A" }}>
          <p className="font-semibold mb-1">Retour enregistre — avoir genere pour la cliente</p>
          <p className="text-sm">Numero : <span className="font-mono font-semibold">{avoirGenere.numero}</span></p>
          <p className="text-sm">Montant : <span className="font-semibold">{fmt(avoirGenere.montant)} F</span></p>
          <p className="text-sm">Valable jusqu'au : <span className="font-semibold">{new Date(avoirGenere.dateValidite).toLocaleDateString("fr-FR")}</span></p>
          <button onClick={() => setAvoirReceipt(avoirGenere)} className="mt-3 flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#3F6B4A", color: "#F3F7F3" }}><Printer size={14} /> Imprimer le bon d'avoir</button>
        </div>
      )}
      {succes && <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "#E9F0EA", color: "#3F6B4A" }}>{succes}</p>}
      {error && <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "#FBEAE7", color: "#8C3B2E" }}>{error}</p>}

      <Field label="Numero de recu">
        <input value={numero} onChange={(e) => { setNumero(e.target.value); setVenteChoisie(null); setAvoirGenere(null); }} style={inputStyle} placeholder="REC-000123" />
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
          <Field label="Article concerne">
            <select value={ligneChoisie} onChange={(e) => setLigneChoisie(e.target.value)} style={inputStyle}>
              <option value="">— Choisir —</option>
              {venteChoisie.lignes.map((l) => <option key={l.id} value={l.id}>{l.designation}{l.pointure ? ` T${l.pointure}` : ""} (×{l.quantite})</option>)}
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Type"><select value={type} onChange={(e) => setType(e.target.value)} style={inputStyle}><option>Retour</option><option>Echange</option></select></Field>
            <Field label="Quantite"><input type="number" min="1" max={ligne?.quantite || 1} value={quantite} onChange={(e) => setQuantite(e.target.value)} style={inputStyle} /></Field>
          </div>
          {type === "Echange" && (
            <Field label="Nouvelle pointure">
              <select value={nouvellePointure} onChange={(e) => setNouvellePointure(e.target.value)} style={inputStyle}>
                <option value="">— Choisir —</option>{POINTURES.map((p) => <option key={p} value={p}>T{p}</option>)}
              </select>
            </Field>
          )}
          {type === "Retour" && (
            <div className="rounded-lg p-3 mt-1 mb-1" style={{ background: "#F1E9DC" }}>
              <p className="text-xs font-medium mb-2" style={{ color: "#6B5D52" }}>Un avoir sera genere automatiquement pour la cliente — aucun remboursement en especes.</p>
              {!venteChoisie.clientId && (
                <p className="text-xs mb-2" style={{ color: "#B04A3B" }}>Cette vente n'a pas de client associe : l'avoir ne pourra pas etre cree.</p>
              )}
              <div className="grid grid-cols-2 gap-3">
                <Field label="Montant de l'avoir (F CFA)"><input type="number" min="0" value={montantRembourse} onChange={(e) => setMontantRembourse(e.target.value)} style={inputStyle} /></Field>
                <Field label="Date de validite de l'avoir"><input type="date" value={dateValiditeAvoir} onChange={(e) => setDateValiditeAvoir(e.target.value)} style={inputStyle} /></Field>
              </div>
              <p className="text-xs mt-2" style={{ color: "#6B5D52" }}>Montant pre-rempli selon le prix de l'article — modifiable si besoin.</p>
            </div>
          )}
          <Field label="Motif (optionnel)"><input value={motif} onChange={(e) => setMotif(e.target.value)} style={inputStyle} /></Field>
          <button onClick={submit} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}><RotateCcw size={15} /> Enregistrer le {type === "Retour" ? "retour" : "echange"}</button>
        </>
      )}

      {avoirReceipt && <AvoirReceiptModal avoir={avoirReceipt} boutique={boutique} clientNom={avoirClientNom} onClose={() => setAvoirReceipt(null)} />}
    </div>
  );
}

function AvoirReceiptModal({ avoir, boutique, clientNom, onClose }) {
  const infos = INFOS_BOUTIQUE[boutique] || {};
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="print-area rounded-xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FFFDF9", fontFamily: "'IBM Plex Mono', monospace" }}>
        <div className="flex items-center justify-between mb-4 no-print"><p className="font-display font-semibold">Bon d'avoir</p><button onClick={onClose}><X size={18} color="#6B5D52" /></button></div>

        <div className="text-center mb-3">
          <p className="font-display font-bold text-sm leading-tight">{infos.nom}</p>
          <p className="font-display font-bold text-sm leading-tight">{infos.ligne2}</p>
          <p className="text-xs mt-1" style={{ color: "#6B5D52" }}>{infos.adresse}</p>
          <p className="text-xs" style={{ color: "#6B5D52" }}>{infos.telephone}</p>
        </div>
        <div style={{ borderTop: "1px dashed #DDD3C4" }} className="my-2" />

        <p className="text-center font-display text-lg font-semibold">BON D'AVOIR</p>
        <p className="text-center font-mono text-base font-semibold mt-1">{avoir.numero}</p>
        <p className="text-center text-xs mb-4" style={{ color: "#6B5D52" }}>Emis le {new Date(avoir.createdAt || Date.now()).toLocaleDateString("fr-FR")}</p>

        <div style={{ borderTop: "1px dashed #DDD3C4", borderBottom: "1px dashed #DDD3C4" }} className="py-3 space-y-2">
          <div className="flex justify-between text-sm"><span style={{ color: "#6B5D52" }}>Client</span><span className="font-medium">{clientNom || "—"}</span></div>
          <div className="flex justify-between text-sm"><span style={{ color: "#6B5D52" }}>Montant</span><span className="font-semibold">{fmt(avoir.montant)} F</span></div>
          <div className="flex justify-between text-sm"><span style={{ color: "#6B5D52" }}>Valable jusqu'au</span><span className="font-medium">{new Date(avoir.dateValidite).toLocaleDateString("fr-FR")}</span></div>
        </div>

        <div className="mt-3 pt-3">
          <p className="text-xs text-center whitespace-pre-line leading-relaxed" style={{ color: "#6B5D52" }}>
            Ce bon est valable dans les deux boutiques La Pointure Espagnole (Angre et Koumassi), en une seule fois, jusqu'a sa date de validite. Il doit etre presente en caisse — numero obligatoire pour l'utiliser.
          </p>
        </div>

        <button onClick={() => window.print()} className="no-print w-full mt-5 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC", fontFamily: "'Inter', sans-serif" }}><Printer size={15} /> Imprimer</button>
      </div>
    </div>
  );
}

function CartesCadeauxSection() {
  const [cartes, setCartes] = useState([]);
  const [numero, setNumero] = useState("");
  const [montant, setMontant] = useState("");
  const [dateValidite, setDateValidite] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => { try { setCartes(await api.bonsValeur.list("CADEAU")); } catch (e) { setError(e.message); } }, []);
  useEffect(() => { load(); }, [load]);

  const creer = async () => {
    if (!montant) { setError("Le montant est obligatoire."); return; }
    try {
      await api.bonsValeur.create({ numero: numero.trim() || undefined, montant: Number(montant), dateValidite: dateValidite || undefined });
      setNumero(""); setMontant(""); setDateValidite(""); setError(""); load();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      {error && <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "#FBEAE7", color: "#8C3B2E" }}>{error}</p>}
      <div className="rounded-xl p-5 mb-6 max-w-md" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
        <p className="font-display font-semibold mb-3 flex items-center gap-2"><Gift size={16} /> Nouvelle carte cadeau</p>
        <Field label="Numero (laisser vide pour generer automatiquement)"><input value={numero} onChange={(e) => setNumero(e.target.value)} style={inputStyle} placeholder="Ex : CG-0001" /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Montant (F CFA)"><input value={montant} onChange={(e) => setMontant(e.target.value.replace(/\D/g, ""))} style={inputStyle} /></Field>
          <Field label="Validite (optionnel)"><input type="date" value={dateValidite} onChange={(e) => setDateValidite(e.target.value)} style={inputStyle} /></Field>
        </div>
        <button onClick={creer} className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}><Plus size={16} /> Creer la carte</button>
      </div>

      <div className="space-y-2">
        {cartes.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <div><p className="font-mono text-sm font-medium">{c.numero}</p><p className="text-xs" style={{ color: "#6B5D52" }}>{c.dateValidite ? `Expire le ${new Date(c.dateValidite).toLocaleDateString("fr-FR")}` : "Sans expiration"}</p></div>
            <div className="text-right">
              <p className="font-mono text-sm">{fmt(c.montant)} F</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: c.utilisee ? "#FBEAE7" : "#E9F0EA", color: c.utilisee ? "#B04A3B" : "#3F6B4A" }}>{c.utilisee ? "Utilisee" : "Disponible"}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AvoirsSection() {
  const [avoirs, setAvoirs] = useState([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => { try { setAvoirs(await api.bonsValeur.list("AVOIR")); } catch (e) { setError(e.message); } }, []);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      {error && <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "#FBEAE7", color: "#8C3B2E" }}>{error}</p>}
      <p className="text-sm mb-4" style={{ color: "#6B5D52" }}>Les avoirs sont generes automatiquement lors d'un retour — cette liste est en lecture seule.</p>
      <div className="space-y-2">
        {avoirs.length === 0 && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucun avoir pour le moment.</p>}
        {avoirs.map((a) => (
          <div key={a.id} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <div>
              <p className="font-mono text-sm font-medium">{a.numero}</p>
              <p className="text-xs" style={{ color: "#6B5D52" }}>{a.client?.nomPrenoms || "Client inconnu"} · {a.dateValidite ? `Valide jusqu'au ${new Date(a.dateValidite).toLocaleDateString("fr-FR")}` : "Sans expiration"}</p>
            </div>
            <div className="text-right">
              <p className="font-mono text-sm">{fmt(a.montant)} F</p>
              <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: a.utilisee ? "#FBEAE7" : "#E9F0EA", color: a.utilisee ? "#B04A3B" : "#3F6B4A" }}>{a.utilisee ? "Utilise" : "Disponible"}</span>
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
  const [recuReglement, setRecuReglement] = useState(null);

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
    if (!montant || Number(montant) <= 0) { setError("Le montant doit etre positif."); return; }
    try {
      const resultat = await api.ventes.reglement(venteSel.id, {
        mode, montant: Number(montant), carteNumero: (mode === "bon_achat" || mode === "avoir") ? carteNumero : undefined,
      });
      setRecuReglement(resultat);
      setVenteSel(null);
      onDone();
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      {succes && <p className="text-sm mb-4 px-3 py-2 rounded-lg" style={{ background: "#E9F0EA", color: "#3F6B4A" }}>{succes}</p>}

      <p className="font-display font-semibold mb-3">Non soldees ({nonSoldees.length})</p>
      <div className="space-y-2 mb-6">
        {nonSoldees.length === 0 && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucune vente a credit en attente de reglement.</p>}
        {nonSoldees.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-xl p-4 flex-wrap gap-2" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <div>
              <p className="font-mono text-sm font-medium">{v.numero}</p>
              <p className="text-xs" style={{ color: "#6B5D52" }}>{v.client?.nomPrenoms || "Client inconnu"} · {new Date(v.date).toLocaleDateString("fr-FR")} · {v.boutique}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-right">
                <p className="text-xs" style={{ color: "#6B5D52" }}>Total {fmt(v.total)} F · Paye {fmt(v.totalPaye)} F</p>
                <p className="text-sm font-semibold" style={{ color: "#B04A3B" }}>Reste {fmt(v.resteAPayer)} F</p>
              </div>
              <button onClick={() => ouvrirReglement(v)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Enregistrer un reglement</button>
            </div>
          </div>
        ))}
      </div>

      <p className="font-display font-semibold mb-3">Soldees ({soldees.length})</p>
      <div className="space-y-2">
        {soldees.map((v) => (
          <div key={v.id} className="flex items-center justify-between rounded-xl p-4 flex-wrap gap-2" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <div>
              <p className="font-mono text-sm font-medium">{v.numero}</p>
              <p className="text-xs" style={{ color: "#6B5D52" }}>{v.client?.nomPrenoms || "Client inconnu"} · {new Date(v.date).toLocaleDateString("fr-FR")} · {v.boutique}</p>
            </div>
            <p className="text-sm font-semibold" style={{ color: "#3F6B4A" }}>Soldee · {fmt(v.total)} F</p>
          </div>
        ))}
      </div>

      {venteSel && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
          <div className="rounded-xl p-6 max-w-sm w-full" style={{ background: "#FFFDF9" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="font-display font-semibold">Reglement — {venteSel.numero}</p>
              <button onClick={() => setVenteSel(null)}><X size={18} color="#6B5D52" /></button>
            </div>
            {error && <p className="text-sm mb-3 px-3 py-2 rounded-lg" style={{ background: "#FBEAE7", color: "#8C3B2E" }}>{error}</p>}
            <p className="text-xs mb-3" style={{ color: "#6B5D52" }}>Reste a payer : {fmt(venteSel.resteAPayer)} F</p>
            <Field label="Mode de paiement">
              <select value={mode} onChange={(e) => setMode(e.target.value)} style={inputStyle}>
                {MODES_PAIEMENT.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Montant (F CFA)">
              <input type="number" min="0" max={venteSel.resteAPayer} value={montant} onChange={(e) => setMontant(e.target.value)} style={inputStyle} />
            </Field>
            {(mode === "bon_achat" || mode === "avoir") && (
              <Field label={mode === "avoir" ? "Numero de l'avoir" : "Numero de la carte cadeau"}>
                <input value={carteNumero} onChange={(e) => setCarteNumero(e.target.value)} style={inputStyle} />
              </Field>
            )}
            <button onClick={enregistrerReglement} className="mt-4 w-full px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: "#3F6B4A", color: "#F3F7F3" }}>Valider le reglement</button>
          </div>
        </div>
      )}

      {recuReglement && <RecuReglementModal recu={recuReglement} onClose={() => setRecuReglement(null)} />}
    </div>
  );
}

function RecuReglementModal({ recu, onClose }) {
  const infos = INFOS_BOUTIQUE[recu.venteBoutique] || {};
  const modeLabel = MODES_PAIEMENT.find((m) => m.id === recu.paiement.mode)?.label || recu.paiement.mode;
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="print-area rounded-xl p-6 max-w-sm w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FFFDF9", fontFamily: "'IBM Plex Mono', monospace" }}>
        <div className="flex items-center justify-between mb-4 no-print"><p className="font-display font-semibold">Reçu de règlement</p><button onClick={onClose}><X size={18} color="#6B5D52" /></button></div>

        <div className="text-center mb-3">
          <p className="font-display font-bold text-sm leading-tight">{infos.nom}</p>
          <p className="font-display font-bold text-sm leading-tight">{infos.ligne2}</p>
          <p className="text-xs mt-1" style={{ color: "#6B5D52" }}>{infos.adresse}</p>
          <p className="text-xs" style={{ color: "#6B5D52" }}>{infos.telephone}</p>
        </div>
        <div style={{ borderTop: "1px dashed #DDD3C4" }} className="my-2" />

        <p className="text-center font-display text-lg font-semibold">RÈGLEMENT DE CRÉDIT</p>
        <p className="text-center text-xs mb-4" style={{ color: "#6B5D52" }}>{new Date().toLocaleString("fr-FR")} · {recu.venteBoutique}</p>

        <div className="text-xs mb-2" style={{ color: "#6B5D52" }}>Vente d'origine : {recu.venteNumero}</div>
        {recu.clientNom && <div className="text-xs mb-3" style={{ color: "#6B5D52" }}>Client : {recu.clientNom}</div>}

        <div style={{ borderTop: "1px dashed #DDD3C4", borderBottom: "1px dashed #DDD3C4" }} className="py-3 space-y-2">
          <div className="flex justify-between text-sm"><span>Total de la vente</span><span>{fmt(recu.totalVente)} F</span></div>
          <div className="flex justify-between text-sm font-semibold" style={{ color: "#3F6B4A" }}><span>Montant réglé aujourd'hui</span><span>{fmt(recu.paiement.montant)} F</span></div>
          <div className="flex justify-between text-xs" style={{ color: "#6B5D52" }}><span>Mode de paiement</span><span>{modeLabel}</span></div>
        </div>

        <div className="flex justify-between font-semibold mt-3 text-sm" style={{ color: recu.resteApres > 0 ? "#B04A3B" : "#3F6B4A" }}>
          <span>{recu.resteApres > 0 ? "RESTE À PAYER" : "SOLDÉ"}</span>
          <span>{fmt(Math.max(0, recu.resteApres))} F</span>
        </div>

        <div style={{ borderTop: "1px dashed #DDD3C4" }} className="mt-3 pt-3">
          <p className="text-xs text-center whitespace-pre-line leading-relaxed" style={{ color: "#6B5D52" }}>{MESSAGE_FIN_TICKET}</p>
        </div>

        <button onClick={() => window.print()} className="no-print w-full mt-5 flex items-center justify-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC", fontFamily: "'Inter', sans-serif" }}><Printer size={15} /> Imprimer</button>
      </div>
    </div>
  );
}