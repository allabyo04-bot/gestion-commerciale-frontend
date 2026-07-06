import { useState, useEffect, useCallback } from "react";
import { Plus, Pencil, Trash2, Cake, Search, X } from "lucide-react";
import { api } from "../api.js";
import { CIVILITES, JOURS, MOIS, COMMUNES, CLIENT_POINTURES, PAYS_LIST, QUARTIERS_PAR_COMMUNE, BOUTIQUES, fmt } from "../constants.js";
import { Field, ConfirmModal, ErrorBanner, inputStyle, selectStyle } from "../components/Shared.jsx";

export default function ClientsSection() {
  const [subTab, setSubTab] = useState("fiche");
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalClient, setModalClient] = useState(null);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try { setClients(await api.clients.list()); } catch (e) { setError(e.message); } finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const openNewClient = () => setModalClient({
    isNew: true, nomPrenoms: "", jourAnniv: "01", moisAnniv: "Janvier", civilite: "Monsieur",
    adresse: "", commune: COMMUNES[0], quartier: "", telephone: "", whatsapp: "",
    pointure: "", pays: "Côte d'Ivoire", carteFidelite: "", dateDelivrance: new Date().toISOString().slice(0, 10), observation: "",
  });
  const openEditClient = (c) => setModalClient({ ...c, isNew: false, dateDelivrance: c.dateDelivrance ? c.dateDelivrance.slice(0, 10) : "" });

  const submitClient = async (form) => {
    if (!form.nomPrenoms.trim()) { setError("Le nom et prénoms du client sont obligatoires."); return; }
    try {
      if (form.isNew) await api.clients.create(form);
      else await api.clients.update(form.id, form);
      setModalClient(null); setError(""); load();
    } catch (e) { setError(e.message); }
  };

  const removeClient = async (c) => {
    try { await api.clients.remove(c.id); setConfirmDelete(null); load(); } catch (e) { setError(e.message); }
  };

  const filtered = clients.filter((c) =>
    c.nomPrenoms.toLowerCase().includes(search.toLowerCase()) ||
    (c.carteFidelite || "").toLowerCase().includes(search.toLowerCase()) ||
    (c.telephone || "").includes(search)
  );

  return (
    <div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      <div className="flex gap-2 mb-6">
        {[["fiche", "Fiche clients"], ["anniversaires", "Anniversaires"], ["achats", "Achats par carte"]].map(([id, label]) => (
          <button key={id} onClick={() => setSubTab(id)} className="px-4 py-2 rounded-full text-sm font-medium" style={subTab === id ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>{label}</button>
        ))}
      </div>

      {loading && <p className="text-sm" style={{ color: "#6B5D52" }}>Chargement…</p>}

      {!loading && subTab === "fiche" && (
        <div>
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Rechercher nom, téléphone ou carte…" style={{ ...selectStyle, minWidth: "260px" }} />
            <button onClick={openNewClient} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>
              <Plus size={16} /> Nouveau client
            </button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((c) => (
              <div key={c.id} className="stitch card-hover rounded-xl p-5" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium leading-tight">{c.nomPrenoms}</p>
                    <p className="text-xs font-mono mt-0.5" style={{ color: "#6B5D52" }}>{c.code}</p>
                  </div>
                  <span className="text-xs px-2.5 py-1 rounded-full" style={{ background: "#F1E9DC", color: "#6B5D52" }}>{c.civilite}</span>
                </div>
                <div className="mt-3 text-xs space-y-1" style={{ color: "#6B5D52" }}>
                  <p>{c.telephone || "— pas de téléphone"}{c.whatsapp ? ` · WhatsApp ${c.whatsapp}` : ""}</p>
                  <p>{c.commune}{c.quartier ? `, ${c.quartier}` : ""}</p>
                  <p className="flex items-center gap-1"><Cake size={11} /> {c.jourAnniv} {c.moisAnniv}</p>
                </div>
                {c.carteFidelite && <span className="inline-block mt-3 text-xs px-2.5 py-1 rounded-full font-mono" style={{ background: "#E9F0EA", color: "#3F6B4A" }}>Carte {c.carteFidelite}</span>}
                <div className="flex items-center justify-end gap-3 mt-4 pt-4" style={{ borderTop: "1px solid #EFE7D9" }}>
                  <button onClick={() => openEditClient(c)} style={{ color: "#8C3B2E" }}><Pencil size={16} /></button>
                  <button onClick={() => setConfirmDelete(c)} style={{ color: "#B04A3B" }}><Trash2 size={16} /></button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {!loading && subTab === "anniversaires" && <AnniversairesReport clients={clients} />}
      {!loading && subTab === "achats" && <AchatsParCarteReport />}

      {modalClient && <ClientModal client={modalClient} onCancel={() => setModalClient(null)} onSubmit={submitClient} />}
      {confirmDelete && <ConfirmModal title="Supprimer ce client ?" message={`${confirmDelete.nomPrenoms} sera retiré de la fiche clients.`} onCancel={() => setConfirmDelete(null)} onConfirm={() => removeClient(confirmDelete)} />}
    </div>
  );
}

function AnniversairesReport({ clients }) {
  const [moisFiltre, setMoisFiltre] = useState("Tous");
  const resultats = clients.filter((c) => moisFiltre === "Tous" || c.moisAnniv === moisFiltre).sort((a, b) => parseInt(a.jourAnniv, 10) - parseInt(b.jourAnniv, 10));
  return (
    <div>
      <div className="flex items-center gap-3 mb-5">
        <p className="text-sm" style={{ color: "#6B5D52" }}>Filtrer par mois :</p>
        <select value={moisFiltre} onChange={(e) => setMoisFiltre(e.target.value)} style={selectStyle}>
          <option>Tous</option>{MOIS.map((m) => <option key={m}>{m}</option>)}
        </select>
      </div>
      <div className="space-y-2">
        {resultats.map((c) => (
          <div key={c.id} className="flex items-center justify-between rounded-lg px-4 py-3" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <div className="flex items-center gap-2"><Cake size={15} color="#8C3B2E" /><span className="text-sm font-medium">{c.nomPrenoms}</span></div>
            <span className="text-sm font-mono" style={{ color: "#6B5D52" }}>{c.jourAnniv} {c.moisAnniv}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function AchatsParCarteReport() {
  const [carte, setCarte] = useState("");
  const [client, setClient] = useState(null);
  const [error, setError] = useState("");
  const [cherche, setCherche] = useState(false);

  const rechercher = async () => {
    setCherche(true);
    setError("");
    try {
      setClient(await api.clients.rechercheParCarte(carte.trim()));
    } catch (e) { setClient(null); setError(e.message); }
  };

  const achats = client?.ventes || [];
  const totalCumule = achats.reduce((s, v) => s + v.total, 0);
  const parBoutique = BOUTIQUES.map((b) => ({ boutique: b, total: achats.filter((v) => v.boutique === b).reduce((s, v) => s + v.total, 0), nb: achats.filter((v) => v.boutique === b).length }));

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <input value={carte} onChange={(e) => setCarte(e.target.value)} onKeyDown={(e) => e.key === "Enter" && rechercher()} placeholder="N° de carte de fidélité" style={{ ...inputStyle, marginTop: 0, maxWidth: "260px" }} />
        <button onClick={rechercher} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}><Search size={15} /> Rechercher</button>
      </div>
      {cherche && error && <p className="text-sm" style={{ color: "#B04A3B" }}>{error}</p>}
      {client && (
        <div>
          <div className="rounded-xl p-5 mb-5" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div><p className="font-display text-lg font-semibold">{client.nomPrenoms}</p><p className="text-xs font-mono" style={{ color: "#6B5D52" }}>Carte {client.carteFidelite} · {client.code}</p></div>
              <div className="text-right"><p className="text-xs font-mono uppercase tracking-wide" style={{ color: "#8C3B2E" }}>Total cumulé</p><p className="font-display text-xl font-semibold">{fmt(totalCumule)} F</p></div>
            </div>
            <div className="grid sm:grid-cols-2 gap-3 mt-4 pt-4" style={{ borderTop: "1px solid #EFE7D9" }}>
              {parBoutique.map((pb) => (
                <div key={pb.boutique} className="flex items-center justify-between text-sm">
                  <span style={{ color: "#6B5D52" }}>{pb.boutique} ({pb.nb} achat{pb.nb > 1 ? "s" : ""})</span>
                  <span className="font-mono">{fmt(pb.total)} F</span>
                </div>
              ))}
            </div>
          </div>
          <div className="space-y-2">
            {achats.map((v) => (
              <div key={v.id} className="flex items-center justify-between rounded-lg px-4 py-3 flex-wrap gap-2" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
                <div><p className="font-mono text-sm font-medium">{v.numero}</p><p className="text-xs" style={{ color: "#6B5D52" }}>{new Date(v.date).toLocaleString("fr-FR")} · {v.boutique} · {v.modeVente}</p></div>
                <p className="font-display font-semibold" style={{ color: "#8C3B2E" }}>{fmt(v.total)} F</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ClientModal({ client, onCancel, onSubmit }) {
  const [form, setForm] = useState(client);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const quartiersConnus = QUARTIERS_PAR_COMMUNE[form.commune] || [];
  const [quartierLibre, setQuartierLibre] = useState(form.quartier && !quartiersConnus.includes(form.quartier));

  const handleCommuneChange = (commune) => {
    set("commune", commune);
    const suivante = QUARTIERS_PAR_COMMUNE[commune] || [];
    if (!suivante.includes(form.quartier)) { set("quartier", ""); setQuartierLibre(false); }
  };
  const handleQuartierSelect = (val) => {
    if (val === "__autre__") { setQuartierLibre(true); set("quartier", ""); }
    else { setQuartierLibre(false); set("quartier", val); }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-10" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="rounded-xl p-6 max-w-lg w-full max-h-[90vh] overflow-y-auto" style={{ background: "#FFFDF9" }}>
        <div className="flex items-center justify-between mb-1">
          <p className="font-display text-lg font-semibold">Fiche renseignement des clients</p>
          <button onClick={onCancel}><X size={18} color="#6B5D52" /></button>
        </div>
        {!form.isNew && <p className="text-xs font-mono mb-3" style={{ color: "#6B5D52" }}>{form.code}</p>}
        <Field label="Noms et Prénoms"><input value={form.nomPrenoms} onChange={(e) => set("nomPrenoms", e.target.value)} style={inputStyle} /></Field>
        <div className="grid grid-cols-3 gap-3">
          <Field label="Jour anniversaire"><select value={form.jourAnniv} onChange={(e) => set("jourAnniv", e.target.value)} style={inputStyle}>{JOURS.map((j) => <option key={j}>{j}</option>)}</select></Field>
          <Field label="Mois"><select value={form.moisAnniv} onChange={(e) => set("moisAnniv", e.target.value)} style={inputStyle}>{MOIS.map((m) => <option key={m}>{m}</option>)}</select></Field>
          <Field label="Civilité"><select value={form.civilite} onChange={(e) => set("civilite", e.target.value)} style={inputStyle}>{CIVILITES.map((c) => <option key={c}>{c}</option>)}</select></Field>
        </div>
        <Field label="Adresse"><input value={form.adresse} onChange={(e) => set("adresse", e.target.value)} style={inputStyle} /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Commune"><select value={form.commune} onChange={(e) => handleCommuneChange(e.target.value)} style={inputStyle}>{COMMUNES.map((c) => <option key={c}>{c}</option>)}</select></Field>
          <Field label="Quartier">
            {quartierLibre || quartiersConnus.length === 0 ? (
              <input value={form.quartier} onChange={(e) => set("quartier", e.target.value)} style={inputStyle} />
            ) : (
              <select value={form.quartier} onChange={(e) => handleQuartierSelect(e.target.value)} style={inputStyle}>
                <option value="">— Choisir —</option>{quartiersConnus.map((q) => <option key={q} value={q}>{q}</option>)}<option value="__autre__">Autre (préciser)</option>
              </select>
            )}
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Téléphone"><input value={form.telephone} onChange={(e) => set("telephone", e.target.value)} style={inputStyle} /></Field>
          <Field label="Whatsapp"><input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} style={inputStyle} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Taille/Pointure"><select value={form.pointure} onChange={(e) => set("pointure", e.target.value)} style={inputStyle}><option value="">—</option>{CLIENT_POINTURES.map((p) => <option key={p} value={p}>T{p}</option>)}</select></Field>
          <Field label="Pays"><select value={form.pays} onChange={(e) => set("pays", e.target.value)} style={inputStyle}>{PAYS_LIST.map((p) => <option key={p}>{p}</option>)}</select></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Carte de Fidélité"><input value={form.carteFidelite} onChange={(e) => set("carteFidelite", e.target.value)} style={inputStyle} /></Field>
          <Field label="Date de Délivrance"><input type="date" value={form.dateDelivrance} onChange={(e) => set("dateDelivrance", e.target.value)} style={inputStyle} /></Field>
        </div>
        <Field label="Observation"><input value={form.observation} onChange={(e) => set("observation", e.target.value)} style={inputStyle} /></Field>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onCancel} className="px-4 py-2 rounded-lg text-sm" style={{ color: "#6B5D52" }}>Fermer</button>
          <button onClick={() => onSubmit(form)} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}>Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
