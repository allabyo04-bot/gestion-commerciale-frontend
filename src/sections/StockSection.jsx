import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, Package, Tag, ChevronRight, X, Search } from "lucide-react";
import { api } from "../api.js";
import { FAMILLES, BOUTIQUES, POINTURES, fmt } from "../constants.js";
import { Field, ConfirmModal, ErrorBanner, inputStyle, selectStyle } from "../components/Shared.jsx";

const FAMILLE_COLORS = { Chaussure: { bg: "#8C3B2E", fg: "#FBF3EC" }, Sac: { bg: "#A8823D", fg: "#2B2320" } };

function stockQty(article, boutique, pointure) {
  const item = article.stocks?.find((s) => s.boutique === boutique && s.pointure === (pointure || null));
  return item?.quantite || 0;
}
function totalStock(article) {
  return (article.stocks || []).reduce((s, i) => s + i.quantite, 0);
}

export default function StockSection() {
  const [tab, setTab] = useState("articles");
  const [articles, setArticles] = useState(null);
  const [brands, setBrands] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalArticle, setModalArticle] = useState(null);
  const [stockEditor, setStockEditor] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [newBrand, setNewBrand] = useState("");
  const [filterFamille, setFilterFamille] = useState("Tous");
  const [filterBrand, setFilterBrand] = useState("Toutes");
  const [searchArticle, setSearchArticle] = useState("");
  const [mouvements, setMouvements] = useState([]);
  const [loadingMouvements, setLoadingMouvements] = useState(false);
  const [articleFiltreId, setArticleFiltreId] = useState("");

  const loadMouvements = useCallback(async (articleId) => {
    setLoadingMouvements(true);
    try {
      const m = await api.articles.historiqueMouvements(articleId ? { articleId } : {});
      setMouvements(m);
    } catch (e) { setError(e.message); } finally { setLoadingMouvements(false); }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([api.articles.list(), api.brands.list()]);
      setArticles(a);
      setBrands(b);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);
useEffect(() => { if (tab === "historique") loadMouvements(articleFiltreId); }, [tab, loadMouvements, articleFiltreId]);

  const brandName = (id) => brands.find((b) => b.id === id)?.nom || "—";

  const addBrand = async () => {
    const nom = newBrand.trim();
    if (!nom) return;
    try { await api.brands.create(nom); setNewBrand(""); load(); } catch (e) { setError(e.message); }
  };
  const deleteBrand = async (id) => {
    try { await api.brands.remove(id); load(); } catch (e) { setError(e.message); }
  };

  const openNewArticle = () => setModalArticle({ isNew: true, designation: "", famille: "Chaussure", marqueId: brands?.[0]?.id || "", prixVente: "" });
  const openEditArticle = (a) => setModalArticle({ ...a, isNew: false });

  const submitArticle = async (form) => {
    if (!form.designation.trim() || !form.marqueId || !form.prixVente) { setError("Désignation, marque et prix de vente sont obligatoires."); return; }
    try {
      if (form.isNew) await api.articles.create(form);
      else await api.articles.update(form.id, { designation: form.designation, prixVente: form.prixVente, actif: form.actif });
      setModalArticle(null); setError(""); load();
    } catch (e) { setError(e.message); }
  };

  const removeArticle = async (a) => {
    try { await api.articles.remove(a.id); setConfirmDelete(null); load(); } catch (e) { setError(e.message); }
  };

  const updateStock = async (articleId, boutique, pointure, quantite) => {
    try { await api.articles.updateStock(articleId, boutique, pointure, quantite); load(); } catch (e) { setError(e.message); }
  };
const ajouterStock = async (articleId, boutique, pointure, quantite) => {
    try { await api.articles.ajouterStock(articleId, boutique, pointure, quantite); load(); } catch (e) { setError(e.message); }
  };

  const virementStock = async (articleId, boutiqueSource, boutiqueDestination, pointure, quantite) => {
    try { await api.articles.virementStock(articleId, boutiqueSource, boutiqueDestination, pointure, quantite); load(); } catch (e) { setError(e.message); }
  };
 const filteredArticles = useMemo(() => (articles || []).filter((a) => {
    if (filterFamille !== "Tous" && a.famille !== filterFamille) return false;
    if (filterBrand !== "Toutes" && a.marqueId !== filterBrand) return false;
    if (searchArticle.trim()) {
      const q = searchArticle.trim().toLowerCase();
      if (!a.designation.toLowerCase().includes(q) && !a.reference.toLowerCase().includes(q)) return false;
    }
    return true;
  }), [articles, filterFamille, filterBrand, searchArticle]);

  const editingArticle = stockEditor ? articles.find((a) => a.id === stockEditor) : null;

  return (
    <div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      <div className="flex gap-2 mb-6">
        {[["articles", "Articles"], ["marques", "Marques (sous-familles)"], ["historique", "Historique des mouvements"], ["etat-stock", "État du stock"], ["import", "Import"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className="px-4 py-2 rounded-full text-sm font-medium" style={tab === id ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>{label}</button>
        ))}
      </div>

      {loading && <p className="text-sm" style={{ color: "#6B5D52" }}>Chargement…</p>}

      {!loading && tab === "articles" && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex gap-2 flex-wrap items-center">
              <div className="relative">
                <input value={searchArticle} onChange={(e) => setSearchArticle(e.target.value)} placeholder="Rechercher un article ou une référence…" style={{ ...selectStyle, paddingLeft: "32px", minWidth: "240px" }} />
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2" color="#6B5D52" />
              </div>
              <select value={filterFamille} onChange={(e) => setFilterFamille(e.target.value)} style={selectStyle}>
                <option>Tous</option>{FAMILLES.map((f) => <option key={f}>{f}</option>)}
              </select>
              <select value={filterBrand} onChange={(e) => setFilterBrand(e.target.value)} style={selectStyle}>
                <option value="Toutes">Toutes les marques</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
              </select>
            </div>
            <button onClick={openNewArticle} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>
              <Plus size={16} /> Nouvel article
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            {filteredArticles.map((a) => {
              const fc = FAMILLE_COLORS[a.famille];
              const total = totalStock(a);
              return (
                <div key={a.id} className="stitch card-hover rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-11 h-11 rounded-full flex items-center justify-center shrink-0" style={{ background: "#F1E9DC" }}><Package size={18} color="#8C3B2E" /></div>
                      <div>
                        <p className="font-medium leading-tight">{a.designation}</p>
                        <p className="text-xs font-mono mt-0.5" style={{ color: "#6B5D52" }}>{a.reference}</p>
                      </div>
                    </div>
                    <p className="font-display font-semibold text-sm" style={{ color: "#8C3B2E" }}>{fmt(a.prixVente)} F</p>
                  </div>
                  <div className="flex items-center gap-2 mt-4 flex-wrap">
                    <span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: fc.bg, color: fc.fg }}>{a.famille}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full flex items-center gap-1" style={{ background: "#F1E9DC", color: "#6B5D52" }}><Tag size={11} /> {brandName(a.marqueId)}</span>
                    <span className="text-xs px-2.5 py-1 rounded-full font-mono" style={{ background: total > 0 ? "#E9F0EA" : "#FBEAE7", color: total > 0 ? "#3F6B4A" : "#B04A3B" }}>{total} en stock</span>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-4" style={{ borderTop: "1px solid #EFE7D9" }}>
                    <button onClick={() => setStockEditor(a.id)} className="text-xs font-medium flex items-center gap-1" style={{ color: "#8C3B2E" }}>Gérer le stock <ChevronRight size={13} /></button>
                    <div className="flex gap-3">
                      <button onClick={() => openEditArticle(a)} style={{ color: "#8C3B2E" }}><Pencil size={16} /></button>
                      <button onClick={() => setConfirmDelete(a)} style={{ color: "#B04A3B" }}><Trash2 size={16} /></button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {!loading && tab === "marques" && (
        <div>
          <div className="flex items-center gap-2 mb-6">
            <input value={newBrand} onChange={(e) => setNewBrand(e.target.value)} placeholder="Nom de la marque" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={{ border: "1px solid #DDD3C4", background: "#FFFFFF" }} onKeyDown={(e) => e.key === "Enter" && addBrand()} />
            <button onClick={addBrand} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}><Plus size={16} /> Ajouter</button>
          </div>
          <div className="grid sm:grid-cols-3 gap-3">
            {brands.map((b) => (
              <div key={b.id} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
                <p className="font-medium text-sm">{b.nom}</p>
                <button onClick={() => deleteBrand(b.id)} style={{ color: "#B04A3B" }}><Trash2 size={15} /></button>

              </div>
            ))}
          </div>
        </div>
      )}
{!loading && tab === "historique" && (
        <div>
          <div className="flex items-center gap-3 mb-5">
            <p className="text-sm" style={{ color: "#6B5D52" }}>Filtrer par article :</p>
            <select value={articleFiltreId} onChange={(e) => setArticleFiltreId(e.target.value)} style={selectStyle}>
              <option value="">Tous les articles</option>
              {(articles || []).map((a) => <option key={a.id} value={a.id}>{a.designation} · {a.reference}</option>)}
            </select>
          </div>

          {articleFiltreId && (() => {
            const art = (articles || []).find((a) => a.id === articleFiltreId);
            if (!art) return null;
            return (
              <div className="rounded-xl p-4 mb-5" style={{ background: "#F1E9DC" }}>
                <p className="text-xs font-mono uppercase tracking-wide mb-2" style={{ color: "#8C3B2E" }}>Stock actuel — {art.designation}</p>
                <div className="flex gap-6 flex-wrap">
                  {BOUTIQUES.map((b) => (
                    <div key={b}>
                      <p className="text-xs" style={{ color: "#6B5D52" }}>{b}</p>
                      <p className="font-display text-lg font-semibold">
                        {(art.stocks || []).filter((s) => s.boutique === b).reduce((s, i) => s + i.quantite, 0)}
                      </p>
                    </div>
                  ))}
                  <div>
                    <p className="text-xs" style={{ color: "#6B5D52" }}>Total</p>
                    <p className="font-display text-lg font-semibold" style={{ color: "#8C3B2E" }}>{totalStock(art)}</p>
                  </div>
                </div>
              </div>
            );
          })()}

          {loadingMouvements && <p className="text-sm" style={{ color: "#6B5D52" }}>Chargement…</p>}
          {!loadingMouvements && (
            <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ background: "#F1E9DC", color: "#6B5D52" }}>
                    <th className="text-left px-4 py-2">Date</th>
                    <th className="text-left px-4 py-2">Article</th>
                    <th className="text-left px-4 py-2">Type</th>
                    <th className="text-left px-4 py-2">Boutique</th>
                    <th className="text-left px-4 py-2">Pointure</th>
                    <th className="text-right px-4 py-2">Quantité</th>
                    <th className="text-right px-4 py-2">Avant → Après</th>
                    <th className="text-left px-4 py-2">Par</th>
                  </tr>
                </thead>
                <tbody>
                  {mouvements.map((m) => (
                    <tr key={m.id} style={{ borderTop: "1px solid #EFE7D9" }}>
                      <td className="px-4 py-2">{new Date(m.date).toLocaleString("fr-FR")}</td>
                      <td className="px-4 py-2">{m.article?.designation}</td>
                      <td className="px-4 py-2">{m.type}</td>
                      <td className="px-4 py-2">{m.type === "Virement" ? `${m.boutiqueSource} → ${m.boutique}` : m.boutique}</td>
                      <td className="px-4 py-2">{m.pointure ? `T${m.pointure}` : "—"}</td>
                      <td className="text-right px-4 py-2">{m.quantite}</td>
                      <td className="text-right px-4 py-2">{m.quantiteAvant} → {m.quantiteApres}</td>
                      <td className="px-4 py-2">{m.effectuePar?.prenom} {m.effectuePar?.nom}</td>
                    </tr>
                  ))}
                  {mouvements.length === 0 && (
                    <tr><td colSpan={8} className="px-4 py-6 text-center" style={{ color: "#6B5D52" }}>Aucun mouvement enregistré pour l'instant.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {!loading && tab === "etat-stock" && <EtatStockSection articles={articles || []} />}
      {tab === "import" && <ImportSection brands={brands} onImported={load} />}
      {modalArticle && <ArticleModal article={modalArticle} brands={brands} onCancel={() => setModalArticle(null)} onSubmit={submitArticle} />}
      {editingArticle && (
        <StockEditorModal
          article={editingArticle}
          onClose={() => setStockEditor(null)}
          onCorriger={(b, p, q) => updateStock(editingArticle.id, b, p, q)}
          onAjouter={(b, p, q) => ajouterStock(editingArticle.id, b, p, q)}
          onVirement={(bs, bd, p, q) => virementStock(editingArticle.id, bs, bd, p, q)}
        />
      )}
      {confirmDelete && (
        <ConfirmModal title="Supprimer cet article ?" message={`${confirmDelete.designation} sera retiré du stock.`} onCancel={() => setConfirmDelete(null)} onConfirm={() => removeArticle(confirmDelete)} />
      )}
    </div>
  );
}

function ArticleModal({ article, brands, onCancel, onSubmit }) {
  const [form, setForm] = useState(article);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="rounded-xl p-6 max-w-md w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FFFDF9" }}>
        <div className="flex items-center justify-between mb-5">
          <p className="font-display text-lg font-semibold">{form.isNew ? "Nouvel article" : "Modifier l'article"}</p>
          <button onClick={onCancel}><X size={18} color="#6B5D52" /></button>
        </div>
        {!form.isNew && <Field label="Référence"><div style={{ ...inputStyle, background: "#F1E9DC", color: "#6B5D52" }}>{form.reference}</div></Field>}
      <Field label="Famille">
          <select value={form.famille} onChange={(e) => set("famille", e.target.value)} style={inputStyle} disabled={!form.isNew}>
            {FAMILLES.map((f) => <option key={f}>{f}</option>)}
          </select>
        </Field>
        <Field label="Désignation"><input value={form.designation} onChange={(e) => set("designation", e.target.value)} style={inputStyle} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Marque">
            <select value={form.marqueId} onChange={(e) => set("marqueId", e.target.value)} style={inputStyle} disabled={!form.isNew}>
              <option value="">— Choisir —</option>{brands.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
          </Field>
          <Field label="Prix de vente (F CFA)"><input value={form.prixVente} onChange={(e) => set("prixVente", e.target.value.replace(/\D/g, ""))} style={inputStyle} inputMode="numeric" /></Field>
        </div>
        {!form.isNew && (
          <p className="text-xs mt-3" style={{ color: "#6B5D52" }}>La famille et la marque ne sont pas modifiables après création (ça changerait la structure du stock déjà en place).</p>
     )}
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm" style={{ color: "#6B5D52" }}>Annuler</button>
          <button onClick={() => onSubmit(form)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
function StockEditorModal({ article, onClose, onCorriger, onAjouter, onVirement }) {
  const [mode, setMode] = useState("corriger");
  const [boutique, setBoutique] = useState(BOUTIQUES[0]);
  const [boutiqueDestination, setBoutiqueDestination] = useState(BOUTIQUES[1] || BOUTIQUES[0]);
  const isChaussure = article.famille === "Chaussure";
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [envoi, setEnvoi] = useState(false);

  const [values, setValues] = useState(() => {
    const init = {};
    if (isChaussure) POINTURES.forEach((p) => { init[`${boutique}__${p}`] = mode === "corriger" ? stockQty(article, boutique, p) : 0; });
    else init[`${boutique}__`] = mode === "corriger" ? stockQty(article, boutique, null) : 0;
    return init;
  });

  const key = (b, p) => `${b}__${p || ""}`;
  const getValue = (b, p) => (key(b, p) in values ? values[key(b, p)] : 0);
  const setValue = (b, p, v) => setValues((prev) => ({ ...prev, [key(b, p)]: v }));

  const changerMode = (m) => {
    setMode(m);
    setError("");
    const init = {};
    if (isChaussure) POINTURES.forEach((p) => { init[key(boutique, p)] = m === "corriger" ? stockQty(article, boutique, p) : 0; });
    else init[key(boutique, null)] = m === "corriger" ? stockQty(article, boutique, null) : 0;
    setValues(init);
  };

  const changerBoutique = (b) => {
    setBoutique(b);
    if (b === boutiqueDestination) {
      const autre = BOUTIQUES.find((x) => x !== b);
      if (autre) setBoutiqueDestination(autre);
    }
    const init = {};
    if (isChaussure) POINTURES.forEach((p) => { init[key(b, p)] = mode === "corriger" ? stockQty(article, b, p) : 0; });
    else init[key(b, null)] = mode === "corriger" ? stockQty(article, b, null) : 0;
    setValues(init);
  };

  const soumettreCorriger = async () => {
    if (envoi) return;
    setEnvoi(true);
    setError("");
    try {
      if (isChaussure) {
        for (const p of POINTURES) await onCorriger(boutique, p, getValue(boutique, p));
      } else {
        await onCorriger(boutique, null, getValue(boutique, null));
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (e) { setError(e.message); } finally { setEnvoi(false); }
  };

  const soumettreAjouter = async () => {
    if (envoi) return;
    setEnvoi(true);
    setError("");
    try {
      if (isChaussure) {
        for (const p of POINTURES) {
          const q = Number(getValue(boutique, p)) || 0;
          if (q > 0) await onAjouter(boutique, p, q);
        }
      } else {
        const q = Number(getValue(boutique, null)) || 0;
        if (q > 0) await onAjouter(boutique, null, q);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      changerMode("ajouter");
    } catch (e) { setError(e.message); } finally { setEnvoi(false); }
  };

  const soumettreVirement = async () => {
    if (envoi) return;
    setEnvoi(true);
    setError("");
    try {
      if (isChaussure) {
        for (const p of POINTURES) {
          const q = Number(getValue(boutique, p)) || 0;
          if (q > 0) await onVirement(boutique, boutiqueDestination, p, q);
        }
      } else {
        const q = Number(getValue(boutique, null)) || 0;
        if (q > 0) await onVirement(boutique, boutiqueDestination, null, q);
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      changerMode("virement");
    } catch (e) { setError(e.message); } finally { setEnvoi(false); }
  };

  const total = isChaussure
    ? POINTURES.reduce((s, p) => s + (Number(getValue(boutique, p)) || 0), 0)
    : Number(getValue(boutique, null)) || 0;

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FFFDF9" }}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-display text-lg font-semibold">{article.designation}</p>
          <button onClick={onClose}><X size={18} color="#6B5D52" /></button>
        </div>
        <p className="text-xs font-mono mb-5" style={{ color: "#6B5D52" }}>{article.reference}</p>

        <div className="flex gap-2 mb-5">
          {[["corriger", "Corriger (inventaire)"], ["ajouter", "Ajouter du stock"], ["virement", "Virement"]].map(([id, label]) => (
            <button key={id} onClick={() => changerMode(id)} className="px-3 py-1.5 rounded-full text-xs font-medium"
              style={mode === id ? { background: "#8C3B2E", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>
              {label}
            </button>
          ))}
        </div>

        {mode === "virement" ? (
          <div className="flex items-center gap-2 mb-5">
            <select value={boutique} onChange={(e) => changerBoutique(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm" style={{ border: "1px solid #DDD3C4" }}>
              {BOUTIQUES.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
            <span className="text-sm" style={{ color: "#6B5D52" }}>vers</span>
            <select value={boutiqueDestination} onChange={(e) => setBoutiqueDestination(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm" style={{ border: "1px solid #DDD3C4" }}>
              {BOUTIQUES.filter((b) => b !== boutique).map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          </div>
        ) : (
          <div className="flex gap-2 mb-5">
            {BOUTIQUES.map((b) => (
              <button key={b} onClick={() => changerBoutique(b)} className="px-3 py-1.5 rounded-full text-xs font-medium" style={boutique === b ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>{b}</button>
            ))}
          </div>
        )}

        {error && <p className="text-sm mb-4" style={{ color: "#B04A3B" }}>{error}</p>}

        {isChaussure ? (
          <div>
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
              {POINTURES.map((p) => (
                <div key={p} className="text-center">
                  <p className="text-xs font-mono mb-1" style={{ color: "#8C3B2E" }}>T{p}</p>
                  <input className="qty-input" type="number" min="0" value={getValue(boutique, p)} onChange={(e) => setValue(boutique, p, e.target.value)} />
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between mt-5 pt-4" style={{ borderTop: "1px solid #EFE7D9" }}>
              <p className="text-xs font-mono uppercase tracking-wide" style={{ color: "#8C3B2E" }}>
                {mode === "corriger" ? `Total pour ${boutique}` : mode === "ajouter" ? "Total à ajouter" : "Total à transférer"}
              </p>
              <p className="font-display text-xl font-semibold">{total}</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: "#8C3B2E" }}>Quantité</p>
            <input className="qty-input" style={{ width: "80px" }} type="number" min="0" value={getValue(boutique, null)} onChange={(e) => setValue(boutique, null, e.target.value)} />
          </div>
        )}

        <button
          onClick={mode === "corriger" ? soumettreCorriger : mode === "ajouter" ? soumettreAjouter : soumettreVirement}
          disabled={envoi}
          className="w-full mt-5 px-4 py-2.5 rounded-lg text-sm font-medium"
          style={{ background: saved ? "#3F6B4A" : envoi ? "#B8A88F" : "#8C3B2E", color: "#FBF3EC", opacity: envoi ? 0.7 : 1 }}>
          {saved ? "Enregistré ✓" : mode === "corriger" ? `Enregistrer le stock pour ${boutique}` : mode === "ajouter" ? `Ajouter au stock de ${boutique}` : `Transférer vers ${boutiqueDestination}`}
        </button>
      </div>
    </div>
  );
}

function EtatStockSection({ articles }) {
  const [filtreFamille, setFiltreFamille] = useState("Tous");
  const [filtreQuantite, setFiltreQuantite] = useState("tous");

  const filtered = articles.filter((a) => {
    if (filtreFamille !== "Tous" && a.famille !== filtreFamille) return false;
    if (filtreQuantite === "nulle" && totalStock(a) !== 0) return false;
    if (filtreQuantite === "stock" && totalStock(a) === 0) return false;
    return true;
  });

  const totalPourBoutiqueEtFamille = (b, f) =>
    articles.filter((a) => a.famille === f).reduce((s, a) => s + (a.stocks || []).filter((si) => si.boutique === b).reduce((s2, i) => s2 + i.quantite, 0), 0);

  const totalFamille = (f) => articles.filter((a) => a.famille === f).reduce((s, a) => s + totalStock(a), 0);

  return (
    <div>
      <div className="flex gap-2 mb-3">
        {["Tous", ...FAMILLES].map((f) => (
          <button key={f} onClick={() => setFiltreFamille(f)} className="px-4 py-2 rounded-full text-sm font-medium"
            style={filtreFamille === f ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>
            {f}
          </button>
        ))}
      </div>
      <div className="flex gap-2 mb-5">
        {[["tous", "Tout"], ["stock", "En stock"], ["nulle", "Quantité nulle"]].map(([id, label]) => (
          <button key={id} onClick={() => setFiltreQuantite(id)} className="px-4 py-2 rounded-full text-sm font-medium"
            style={filtreQuantite === id ? { background: "#8C3B2E", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>
            {label}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {FAMILLES.map((f) => (
          <div key={f} className="rounded-2xl p-4" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <p className="text-xs font-mono uppercase tracking-wide mb-2" style={{ color: "#8C3B2E" }}>{f}s en stock</p>
            <div className="flex gap-6 items-end">
              {BOUTIQUES.map((b) => (
                <div key={b}>
                  <p className="text-xs" style={{ color: "#6B5D52" }}>{b}</p>
                  <p className="font-display text-lg font-semibold">{totalPourBoutiqueEtFamille(b, f)}</p>
                </div>
              ))}
              <div>
                <p className="text-xs" style={{ color: "#6B5D52" }}>Total</p>
                <p className="font-display text-xl font-semibold" style={{ color: "#8C3B2E" }}>{totalFamille(f)}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-2xl overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F1E9DC", color: "#6B5D52" }}>
              <th className="text-left px-4 py-2">Article</th>
              <th className="text-left px-4 py-2">Famille</th>
              {BOUTIQUES.map((b) => <th key={b} className="text-right px-4 py-2">{b}</th>)}
              <th className="text-right px-4 py-2">Total</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((a) => (
              <tr key={a.id} style={{ borderTop: "1px solid #EFE7D9" }}>
                <td className="px-4 py-2">{a.designation} <span className="font-mono text-xs" style={{ color: "#6B5D52" }}>· {a.reference}</span></td>
                <td className="px-4 py-2">{a.famille}</td>
                {BOUTIQUES.map((b) => (
                  <td key={b} className="text-right px-4 py-2">{(a.stocks || []).filter((s) => s.boutique === b).reduce((s, i) => s + i.quantite, 0)}</td>
                ))}
                <td className="text-right px-4 py-2 font-semibold">{totalStock(a)}</td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr><td colSpan={2 + BOUTIQUES.length + 1} className="px-4 py-6 text-center" style={{ color: "#6B5D52" }}>Aucun article.</td></tr>
            )}
          </tbody>
        </table>
      </div>
   </div>
  );
}

function ImportSection({ brands, onImported }) {
  const [marqueId, setMarqueId] = useState(brands?.[0]?.id || "");
  const [famille, setFamille] = useState("Chaussure");
  const [boutique, setBoutique] = useState(BOUTIQUES[0]);
  const [fichier, setFichier] = useState(null);
  const [apercu, setApercu] = useState(null);
  const [lignesEdit, setLignesEdit] = useState([]);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");
  const [resultat, setResultat] = useState(null);

  useEffect(() => {
    if (resultat || erreur) window.scrollTo({ top: 0, behavior: "smooth" });
  }, [resultat, erreur]);

  const analyser = async () => {
    if (!fichier || !marqueId) { setErreur("Choisis une marque et un fichier."); return; }
    setChargement(true); setErreur(""); setResultat(null);
    try {
      const fd = new FormData();
      fd.append("fichier", fichier);
      fd.append("marqueId", marqueId);
      fd.append("famille", famille);
      fd.append("boutique", boutique);
      const res = await api.articles.importApercu(fd);
      setApercu(res);
      setLignesEdit(res.lignes.map((l) => ({ ...l, prixVente: l.ecartPrix ? l.ancienPrix : (l.nouveauPrix ?? l.ancienPrix) })));
    } catch (e) { setErreur(e.message); } finally { setChargement(false); }
  };

  const confirmer = async () => {
    setChargement(true); setErreur("");
    try {
      const res = await api.articles.importConfirmer({
        marqueId, famille, boutique,
        lignes: lignesEdit.map((l) => ({ designation: l.designation, articleId: l.articleId, prixVente: l.prixVente, quantites: l.quantites })),
      });
      setResultat(res);
      setApercu(null);
      setFichier(null);
      onImported();
    } catch (e) { setErreur(e.message); } finally { setChargement(false); }
  };

  const choisirPrix = (idx, prix) => {
    setLignesEdit((prev) => prev.map((l, i) => (i === idx ? { ...l, prixVente: prix } : l)));
  };

  return (
    <div>
      <div className="rounded-2xl p-5 mb-6" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
        <p className="font-display text-lg font-semibold mb-4">Importer un arrivage (mise en stock)</p>
        <div className="grid sm:grid-cols-3 gap-3 mb-4">
          <div>
            <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Marque</label>
            <select value={marqueId} onChange={(e) => setMarqueId(e.target.value)} style={selectStyle}>
              <option value="">— Choisir —</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.nom}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Famille</label>
            <select value={famille} onChange={(e) => setFamille(e.target.value)} style={selectStyle}>
              {FAMILLES.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Boutique</label>
            <select value={boutique} onChange={(e) => setBoutique(e.target.value)} style={selectStyle}>
              {BOUTIQUES.map((b) => <option key={b}>{b}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <input type="file" accept=".xls,.xlsx" onChange={(e) => setFichier(e.target.files?.[0] || null)} className="text-sm" />
          <button onClick={analyser} disabled={chargement || !fichier} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC", opacity: chargement || !fichier ? 0.6 : 1 }}>
            {chargement ? "Analyse..." : "Analyser le fichier"}
          </button>
        </div>
        <p className="text-xs mt-2" style={{ color: "#6B5D52" }}>
          {famille === "Chaussure" ? "Colonnes attendues : REFERENCES, T35 à T42, PRIX DE VENTE." : "Colonnes attendues : REFERENCES, QUANTITE, PRIX DE VENTE."}
        </p>
      </div>

      {erreur && <p className="text-sm mb-4 p-3 rounded-lg" style={{ color: "#B04A3B", background: "#FBEAE7" }}>⚠ {erreur}</p>}

      {resultat && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: "#E9F0EA", border: "1px solid #C9DECD" }}>
          <p className="font-medium text-sm" style={{ color: "#3F6B4A" }}>
            Import terminé : {resultat.articlesCreees} article(s) créé(s), {resultat.articlesMisesAJour} prix mis à jour, {resultat.mouvements} mouvement(s) de stock enregistré(s).
          </p>
        </div>
      )}

      {apercu && (
        <div>
          <div className="flex items-center gap-4 mb-4 flex-wrap">
            <p className="text-sm" style={{ color: "#6B5D52" }}>
              <strong>{apercu.marque}</strong> · {apercu.famille} · {apercu.boutique} — {apercu.nbNouveaux} nouveau(x), {apercu.nbExistants} existant(s)
              {apercu.nbEcartsPrix > 0 && <span style={{ color: "#B04A3B" }}> · {apercu.nbEcartsPrix} écart(s) de prix à valider</span>}
            </p>
          </div>

          <div className="rounded-2xl overflow-hidden mb-5" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#F1E9DC", color: "#6B5D52" }}>
                  <th className="text-left px-4 py-2">Désignation</th>
                  <th className="text-left px-4 py-2">Statut</th>
                  <th className="text-right px-4 py-2">Quantité à ajouter</th>
                  <th className="text-right px-4 py-2">Prix</th>
                </tr>
              </thead>
              <tbody>
                {lignesEdit.map((l, i) => (
                  <tr key={i} style={{ borderTop: "1px solid #EFE7D9" }}>
                    <td className="px-4 py-2">{l.designation}</td>
                    <td className="px-4 py-2">
                      {l.existant
                        ? <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#F1E9DC", color: "#6B5D52" }}>Existant</span>
                        : <span className="text-xs px-2 py-0.5 rounded-full" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Nouveau</span>}
                    </td>
                    <td className="text-right px-4 py-2">{l.quantiteTotale}</td>
                    <td className="text-right px-4 py-2">
                      {l.ecartPrix ? (
                        <div className="flex items-center justify-end gap-2">
                          <span className="text-xs" style={{ color: "#B04A3B" }}>{l.ancienPrix} F → {l.nouveauPrix} F</span>
                          <select value={l.prixVente} onChange={(e) => choisirPrix(i, Number(e.target.value))} className="text-xs px-2 py-1 rounded" style={{ border: "1px solid #DDD3C4" }}>
                            <option value={l.ancienPrix}>Garder {l.ancienPrix} F</option>
                            <option value={l.nouveauPrix}>Prendre {l.nouveauPrix} F</option>
                          </select>
                        </div>
                      ) : (
                        <span>{l.prixVente ? `${l.prixVente} F` : "—"}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button onClick={() => { setApercu(null); setFichier(null); }} className="px-4 py-2 rounded-lg text-sm" style={{ color: "#6B5D52" }}>Annuler</button>
            <button onClick={confirmer} disabled={chargement} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC", opacity: chargement ? 0.6 : 1 }}>
              {chargement ? "Import en cours..." : "Confirmer l'import"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}