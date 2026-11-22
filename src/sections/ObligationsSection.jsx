import { useState, useEffect, useCallback } from "react";
import { Plus, Paperclip, Trash2, Check, X, FileText } from "lucide-react";
import { api, recupererFichier } from "../api.js";
import { fmt } from "../constants.js";
import { ErrorBanner, inputStyle, selectStyle, Field } from "../components/Shared.jsx";

// Lot 6 : suivi des obligations administratives de La Pointure (taxes, amendes, convocations, pièces, bail, droits d'auteur).
const CATEGORIES = { TAXE: "Taxe", AMENDE: "Amende / transaction", CONVOCATION: "Convocation", DOCUMENT: "Pièce à renouveler", BAIL: "Bail / timbre", DROITS_AUTEUR: "Droits d'auteur (BURIDA)", AUTRE: "Autre" };
const PERIODICITES = { UNIQUE: "Une seule fois", MENSUELLE: "Chaque mois", TRIMESTRIELLE: "Chaque trimestre", ANNUELLE: "Chaque année" };
const STATUTS = { A_FAIRE: "À faire", EN_COURS: "En cours", PAYE: "Payée", REGULARISE: "Régularisée" };
const carte = { background: "#FFFFFF", border: "1px solid #EAE1D2" };
const dateFr = (d) => new Date(d).toLocaleDateString("fr-FR");
const versInput = (d) => new Date(d).toISOString().slice(0, 10);
const VIDE = { intitule: "", categorie: "TAXE", organisme: "", reference: "", montant: "", periodicite: "UNIQUE", echeance: "", statut: "A_FAIRE", boutique: "", responsable: "", delaiObtentionJours: "", notes: "" };

function Delai({ o }) {
  if (o.joursRestants === null) return <span style={{ color: "#6B5D52" }}>{STATUTS[o.statut]}{o.reglementLe ? ` le ${dateFr(o.reglementLe)}` : ""}</span>;
  const j = o.joursRestants;
  const [texte, couleur] = j < 0 ? [`En retard de ${-j} jour${-j > 1 ? "s" : ""}`, "#B04A3B"] : j === 0 ? ["Aujourd'hui", "#B04A3B"] : j <= 7 ? [`Dans ${j} jour${j > 1 ? "s" : ""}`, "#B5762B"] : [`Dans ${j} jours`, "#3F6B4A"];
  return <span className="font-medium" style={{ color: couleur }}>{texte}</span>;
}

// Réduit les photos prises au téléphone (≈ 1600 px, JPEG) pour garder une base légère ; les PDF sont envoyés tels quels.
function lireFichier(fichier) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error("Lecture du fichier impossible."));
    lecteur.onload = () => {
      const url = String(lecteur.result);
      if (!fichier.type.startsWith("image/")) return resolve({ mime: fichier.type, donnees: url.split(",")[1] });
      const img = new Image();
      img.onerror = () => reject(new Error("Image illisible."));
      img.onload = () => {
        const echelle = Math.min(1, 1600 / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * echelle); c.height = Math.round(img.height * echelle);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve({ mime: "image/jpeg", donnees: c.toDataURL("image/jpeg", 0.8).split(",")[1] });
      };
      img.src = url;
    };
    lecteur.readAsDataURL(fichier);
  });
}

function Formulaire({ initial, onSauve, onFermer }) {
  const [f, setF] = useState(initial ? { ...VIDE, ...initial, echeance: versInput(initial.echeance), montant: initial.montant ?? "", delaiObtentionJours: initial.delaiObtentionJours ?? "" } : VIDE);
  const [error, setError] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const maj = (c) => (e) => setF({ ...f, [c]: e.target.value });
  const enregistrer = async () => {
    setEnvoi(true); setError("");
    try { const o = initial ? await api.obligations.update(initial.id, f) : await api.obligations.create(f); onSauve(o); } catch (e) { setError(e.message); setEnvoi(false); }
  };
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto p-4" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="w-full max-w-xl rounded-2xl p-5 my-6" style={{ background: "#FFFDF9" }}>
        <div className="flex items-center justify-between mb-3"><h3 className="font-display text-xl font-semibold">{initial ? "Modifier l'obligation" : "Nouvelle obligation"}</h3><button type="button" onClick={onFermer}><X size={18} /></button></div>
        <ErrorBanner error={error} onClose={() => setError("")} />
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="sm:col-span-2"><Field label="Intitulé (obligatoire)"><input value={f.intitule} onChange={maj("intitule")} placeholder="Ex. Proposition de transaction n° 819" style={inputStyle} /></Field></div>
          <Field label="Type"><select value={f.categorie} onChange={maj("categorie")} style={inputStyle}>{Object.entries(CATEGORIES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Organisme"><input value={f.organisme} onChange={maj("organisme")} placeholder="Ex. Direction générale des impôts" style={inputStyle} /></Field>
          <Field label="Échéance (obligatoire)"><input type="date" value={f.echeance} onChange={maj("echeance")} style={inputStyle} /></Field>
          <Field label="Montant (F)"><input type="number" min="0" inputMode="numeric" value={f.montant} onChange={maj("montant")} style={inputStyle} /></Field>
          <Field label="Se répète"><select value={f.periodicite} onChange={maj("periodicite")} style={inputStyle}>{Object.entries(PERIODICITES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <Field label="Référence (n° de PV, de convocation…)"><input value={f.reference} onChange={maj("reference")} style={inputStyle} /></Field>
          <Field label="Boutique concernée"><select value={f.boutique} onChange={maj("boutique")} style={inputStyle}><option value="">Les deux / aucune</option><option>Angré</option><option>Koumassi</option></select></Field>
          <Field label="Responsable du suivi"><input value={f.responsable} onChange={maj("responsable")} style={inputStyle} /></Field>
          <Field label="Délai d'obtention (jours)"><input type="number" min="0" inputMode="numeric" value={f.delaiObtentionJours} onChange={maj("delaiObtentionJours")} placeholder="Pour une pièce à renouveler" style={inputStyle} /></Field>
          <Field label="Statut"><select value={f.statut} onChange={maj("statut")} style={inputStyle}>{Object.entries(STATUTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
          <div className="sm:col-span-2"><Field label="Notes"><textarea value={f.notes} onChange={maj("notes")} rows={3} style={inputStyle} /></Field></div>
        </div>
        <div className="flex justify-end gap-2 mt-4">
          <button type="button" onClick={onFermer} className="px-4 py-2 rounded-lg text-sm" style={{ border: "1px solid #DDD3C4" }}>Annuler</button>
          <button type="button" disabled={envoi} onClick={enregistrer} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#2B2320", color: "#FBF3EC" }}>{envoi ? "Enregistrement…" : "Enregistrer"}</button>
        </div>
        <p className="text-xs mt-3" style={{ color: "#6B5D52" }}>Tu pourras joindre la photo ou le scan du document après l'enregistrement.</p>
      </div>
    </div>
  );
}

function Ligne({ o, onChange, onModifier, onError }) {
  const [ouvert, setOuvert] = useState(false);
  const [occupe, setOccupe] = useState(false);
  const ouverte = o.statut === "A_FAIRE" || o.statut === "EN_COURS";
  const regler = async (statut) => {
    if (!window.confirm(statut === "PAYE" ? "Marquer cette obligation comme payée ?" : "Marquer cette obligation comme régularisée ?")) return;
    setOccupe(true);
    try { await api.obligations.regler(o.id, { statut }); onChange(); } catch (e) { onError(e.message); setOccupe(false); }
  };
  const supprimer = async () => {
    if (!window.confirm("Supprimer définitivement cette obligation et ses pièces jointes ?")) return;
    try { await api.obligations.remove(o.id); onChange(); } catch (e) { onError(e.message); }
  };
  const joindre = async (e) => {
    const fichier = e.target.files?.[0]; e.target.value = "";
    if (!fichier) return;
    setOccupe(true);
    try { const { mime, donnees } = await lireFichier(fichier); await api.obligations.ajouterPiece(o.id, { nom: fichier.name, mime, donnees }); onChange(); } catch (err) { onError(err.message); setOccupe(false); }
  };
  const voir = async (p) => {
    try { window.open(URL.createObjectURL(await recupererFichier(`/api/obligations/pieces/${p.id}`)), "_blank"); } catch (err) { onError(err.message); }
  };
  const retirer = async (p) => {
    if (!window.confirm("Retirer cette pièce jointe ?")) return;
    try { await api.obligations.supprimerPiece(p.id); onChange(); } catch (err) { onError(err.message); }
  };
  return (
    <div className="rounded-xl p-4 mb-2" style={carte}>
      <div className="flex flex-wrap items-start justify-between gap-2 cursor-pointer" onClick={() => setOuvert(!ouvert)}>
        <div className="min-w-0">
          <p className="text-sm font-medium">{o.intitule}</p>
          <p className="text-xs" style={{ color: "#6B5D52" }}>{CATEGORIES[o.categorie]}{o.organisme ? ` · ${o.organisme}` : ""}{o.reference ? ` · n° ${o.reference}` : ""}{o.periodicite !== "UNIQUE" ? ` · ${PERIODICITES[o.periodicite].toLowerCase()}` : ""}</p>
        </div>
        <div className="text-right text-sm">
          <p><Delai o={o} /></p>
          <p className="text-xs" style={{ color: "#6B5D52" }}>Échéance {dateFr(o.echeance)}{o.montant != null ? ` · ${fmt(o.montant)} F` : ""}{o.pieces?.length ? ` · 📎 ${o.pieces.length}` : ""}</p>
        </div>
      </div>
      {ouvert && (
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid #EFE7D9" }}>
          {(o.boutique || o.responsable || o.delaiObtentionJours != null) && <p className="text-xs mb-2" style={{ color: "#6B5D52" }}>{[o.boutique && `Boutique : ${o.boutique}`, o.responsable && `Suivi par : ${o.responsable}`, o.delaiObtentionJours != null && `Délai d'obtention : ${o.delaiObtentionJours} jours`].filter(Boolean).join(" · ")}</p>}
          {o.notes && <p className="text-sm mb-2 whitespace-pre-wrap">{o.notes}</p>}
          <div className="flex flex-wrap gap-2 mb-3">
            {o.pieces?.map((p) => (
              <span key={p.id} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs" style={{ background: "#F1E9DC" }}>
                <button type="button" onClick={() => voir(p)} className="inline-flex items-center gap-1"><FileText size={12} /> {p.nom}</button>
                <button type="button" onClick={() => retirer(p)} title="Retirer"><X size={12} /></button>
              </span>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            {ouverte && <button type="button" disabled={occupe} onClick={() => regler("PAYE")} className="px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1" style={{ background: "#3F6B4A", color: "#F3F7F3" }}><Check size={13} /> Payée</button>}
            {ouverte && <button type="button" disabled={occupe} onClick={() => regler("REGULARISE")} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: "1px solid #3F6B4A", color: "#3F6B4A" }}>Régularisée</button>}
            <label className="px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1 cursor-pointer" style={{ border: "1px solid #DDD3C4" }}><Paperclip size={13} /> Joindre une photo ou un PDF<input type="file" accept="image/*,application/pdf" onChange={joindre} className="hidden" /></label>
            <button type="button" onClick={() => onModifier(o)} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={{ border: "1px solid #DDD3C4" }}>Modifier</button>
            <button type="button" onClick={supprimer} className="px-3 py-1.5 rounded-lg text-xs font-medium inline-flex items-center gap-1" style={{ border: "1px solid #E5C6C0", color: "#B04A3B" }}><Trash2 size={13} /> Supprimer</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ObligationsSection() {
  const [filtre, setFiltre] = useState("OUVERTES");
  const [liste, setListe] = useState(null);
  const [resume, setResume] = useState(null);
  const [error, setError] = useState("");
  const [forme, setForme] = useState(null); // null | "nouvelle" | obligation
  const charger = useCallback(async () => {
    try { const [l, r] = await Promise.all([api.obligations.list(filtre), api.obligations.resume()]); setListe(l); setResume(r); } catch (e) { setError(e.message); }
  }, [filtre]);
  useEffect(() => { charger(); }, [charger]);
  const Chiffre = ({ t, v, alerte }) => <div className="rounded-xl p-4" style={carte}><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>{t}</p><p className="font-display text-2xl font-semibold" style={alerte && v > 0 ? { color: "#B04A3B" } : undefined}>{v}</p></div>;
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <h2 className="font-display text-3xl font-semibold">Obligations administratives</h2>
        <button type="button" onClick={() => setForme("nouvelle")} className="px-4 py-2 rounded-full text-sm font-medium inline-flex items-center gap-1.5" style={{ background: "#2B2320", color: "#FBF3EC" }}><Plus size={15} /> Nouvelle</button>
      </div>
      <p className="text-sm mb-4" style={{ color: "#6B5D52" }}>Taxes, amendes, convocations, pièces à renouveler : ne manquer aucune échéance.</p>
      <ErrorBanner error={error} onClose={() => setError("")} />
      {resume && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <Chiffre t="En retard" v={resume.enRetard} alerte /><Chiffre t="Dans les 7 jours" v={resume.sous7} alerte /><Chiffre t="Dans les 30 jours" v={resume.sous30} />
          <Chiffre t="Total à régler" v={`${fmt(resume.montantOuvert)} F`} />
        </div>
      )}
      <div className="flex gap-2 mb-4 flex-wrap">
        {[["OUVERTES", "À traiter"], ["PAYE", "Payées"], ["REGULARISE", "Régularisées"], ["TOUTES", "Toutes"]].map(([k, t]) => (
          <button key={k} type="button" onClick={() => setFiltre(k)} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={filtre === k ? { background: "#2B2320", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>{t}</button>
        ))}
      </div>
      {liste && liste.length === 0 && <p className="text-sm py-6" style={{ color: "#6B5D52" }}>{filtre === "OUVERTES" ? "Aucune obligation à traiter. Ajoute la première avec « Nouvelle »." : "Rien à afficher ici."}</p>}
      {liste?.map((o) => <Ligne key={o.id} o={o} onChange={charger} onModifier={setForme} onError={setError} />)}
      {forme && <Formulaire initial={forme === "nouvelle" ? null : forme} onFermer={() => setForme(null)} onSauve={() => { setForme(null); charger(); }} />}
    </div>
  );
}
