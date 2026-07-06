import { useState, useEffect, useCallback, useMemo } from "react";
import { Plus, Pencil, Trash2, Package, Tag, ChevronRight, X } from "lucide-react";
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

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [a, b] = await Promise.all([api.articles.list(), api.brands.list()]);
      setArticles(a);
      setBrands(b);
    } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

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

  const filteredArticles = useMemo(() => (articles || []).filter((a) => {
    if (filterFamille !== "Tous" && a.famille !== filterFamille) return false;
    if (filterBrand !== "Toutes" && a.marqueId !== filterBrand) return false;
    return true;
  }), [articles, filterFamille, filterBrand]);

  const editingArticle = stockEditor ? articles.find((a) => a.id === stockEditor) : null;

  return (
    <div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      <div className="flex gap-2 mb-6">
        {[["articles", "Articles"], ["marques", "Marques (sous-familles)"]].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className="px-4 py-2 rounded-full text-sm font-medium" style={tab === id ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>{label}</button>
        ))}
      </div>

      {loading && <p className="text-sm" style={{ color: "#6B5D52" }}>Chargement…</p>}

      {!loading && tab === "articles" && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div className="flex gap-2">
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

      {modalArticle && <ArticleModal article={modalArticle} brands={brands} onCancel={() => setModalArticle(null)} onSubmit={submitArticle} />}
      {editingArticle && <StockEditorModal article={editingArticle} onClose={() => setStockEditor(null)} onChange={(b, p, q) => updateStock(editingArticle.id, b, p, q)} />}
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

function StockEditorModal({ article, onClose, onChange }) {
  const [boutique, setBoutique] = useState(BOUTIQUES[0]);
  const isChaussure = article.famille === "Chaussure";
  const [values, setValues] = useState(() => {
    const init = {};
    if (isChaussure) POINTURES.forEach((p) => { init[`${boutique}__${p}`] = stockQty(article, boutique, p); });
    else init[`${boutique}__`] = stockQty(article, boutique, null);
    return init;
  });
  const [saved, setSaved] = useState(false);

  const key = (b, p) => `${b}__${p || ""}`;
  const getValue = (b, p) => (key(b, p) in values ? values[key(b, p)] : stockQty(article, b, p));
  const setValue = (b, p, v) => setValues((prev) => ({ ...prev, [key(b, p)]: v }));

  const changerBoutique = (b) => {
    setBoutique(b);
    setValues((prev) => {
      const next = { ...prev };
      if (isChaussure) POINTURES.forEach((p) => { if (!(key(b, p) in next)) next[key(b, p)] = stockQty(article, b, p); });
      else if (!(key(b, null) in next)) next[key(b, null)] = stockQty(article, b, null);
      return next;
    });
  };

  const enregistrer = async () => {
    if (isChaussure) {
      for (const p of POINTURES) await onChange(boutique, p, getValue(boutique, p));
    } else {
      await onChange(boutique, null, getValue(boutique, null));
    }
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FFFDF9" }}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-display text-lg font-semibold">{article.designation}</p>
          <button onClick={onClose}><X size={18} color="#6B5D52" /></button>
        </div>
        <p className="text-xs font-mono mb-5" style={{ color: "#6B5D52" }}>{article.reference}</p>
        <div className="flex gap-2 mb-5">
          {BOUTIQUES.map((b) => (
            <button key={b} onClick={() => changerBoutique(b)} className="px-3 py-1.5 rounded-full text-xs font-medium" style={boutique === b ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>{b}</button>
          ))}
        </div>
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
              <p className="text-xs font-mono uppercase tracking-wide" style={{ color: "#8C3B2E" }}>Total pour {boutique}</p>
              <p className="font-display text-xl font-semibold">{POINTURES.reduce((s, p) => s + (Number(getValue(boutique, p)) || 0), 0)}</p>
            </div>
          </div>
        ) : (
          <div>
            <p className="text-xs font-mono mb-1" style={{ color: "#8C3B2E" }}>Quantité</p>
            <input className="qty-input" style={{ width: "80px" }} type="number" min="0" value={getValue(boutique, null)} onChange={(e) => setValue(boutique, null, e.target.value)} />
          </div>
        )}
        <button onClick={enregistrer} className="w-full mt-5 px-4 py-2.5 rounded-lg text-sm font-medium" style={{ background: saved ? "#3F6B4A" : "#8C3B2E", color: "#FBF3EC" }}>
          {saved ? "Enregistré ✓" : `Enregistrer le stock pour ${boutique}`}
        </button>
      </div>
    </div>
  );
}
