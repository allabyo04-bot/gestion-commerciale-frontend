import { useState, useEffect, useCallback, useRef } from "react";
import { Camera, Check, X, Plus, Trash2, Banknote } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { BOUTIQUES, fmt } from "../constants.js";
import { Field, ErrorBanner, ConfirmModal, inputStyle, selectStyle } from "../components/Shared.jsx";

// Lot 1 (B3) et lot 10 : menu « Livreurs » — frais d'expédition à saisir au retour du livreur, remise de fin de journée
// (encaissements, bons de frais avec preuve, rémunération), ce qu'on doit à chaque livreur et le paiement.
const carte = { background: "#FFFFFF", border: "1px solid #EAE1D2" };
const bouton = (couleur = "#8C3B2E") => ({ background: couleur, color: "#FBF3EC", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 500 });
const contour = { border: "1px solid #DDD3C4", color: "#6B5D52", padding: "8px 14px", borderRadius: "8px", fontSize: "13px", fontWeight: 500 };
const jourIso = (d) => d.toISOString().slice(0, 10);
const dateFr = (j) => (j ? new Date(j.length <= 10 ? `${j}T12:00:00` : j).toLocaleDateString("fr-FR") : "—");
const STATUT_FRAIS = { EN_COURS: ["En cours", "#8A6A22", "#FBF3E3"], A_REMBOURSER: ["À rembourser", "#B04A3B", "#FBEAE7"], CLOTUREE: ["Clôturée", "#3F6B4A", "#E9F0EA"] };
const STATUT_BON = { A_VERIFIER: ["À vérifier", "#8A6A22", "#FBF3E3"], VALIDE: ["Validé", "#3F6B4A", "#E9F0EA"], REFUSE: ["Refusé", "#B04A3B", "#FBEAE7"] };
const Pastille = ({ t }) => <span className="text-xs px-2 py-0.5 rounded-full whitespace-nowrap" style={{ color: t[1], background: t[2] }}>{t[0]}</span>;

export default function LivreursSection() {
  const { user, fonctions } = useAuth();
  const estAdmin = !!user?.role?.systeme;
  const lot1 = !!fonctions.lot1, lot10 = !!fonctions.lot10;
  const onglets = [
    ...(lot1 ? [["frais", "Frais d'expédition"]] : []),
    ...(lot10 ? [["remises", "Remises de fin de journée"]] : []),
    ...(lot10 && estAdmin ? [["apayer", "À payer"], ["comptes", "Comptes des livreurs"]] : []),
  ];
  const [onglet, setOnglet] = useState(onglets[0]?.[0] || "frais");
  return (
    <div>
      <h2 className="font-display text-2xl font-semibold mb-1">Livreurs</h2>
      <p className="text-sm mb-4" style={{ color: "#6B5D52" }}>Frais avancés par les livreurs, remise de leur journée et ce que la boutique leur doit.</p>
      <div className="flex gap-2 mb-5 flex-wrap">
        {onglets.map(([id, t]) => (
          <button key={id} type="button" onClick={() => setOnglet(id)} className="px-3 py-1.5 rounded-lg text-sm font-medium"
            style={onglet === id ? { background: "#2B2320", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>{t}</button>
        ))}
      </div>
      {onglet === "frais" && lot1 && <FraisAttente estAdmin={estAdmin} />}
      {onglet === "remises" && lot10 && <Remises estAdmin={estAdmin} />}
      {onglet === "apayer" && lot10 && estAdmin && <APayer />}
      {onglet === "comptes" && lot10 && estAdmin && <Comptes />}
    </div>
  );
}

// ── Frais d'expédition : saisie du coût réel au retour du livreur, puis remboursement ──────────
function FraisAttente({ estAdmin }) {
  const [statut, setStatut] = useState("EN_COURS");
  const [lignes, setLignes] = useState([]);
  const [livreurs, setLivreurs] = useState([]);
  const [saisie, setSaisie] = useState({});
  const [error, setError] = useState("");
  const [confirmer, setConfirmer] = useState(null);
  const charger = useCallback(async () => {
    try { setError(""); setLignes(await api.fraisExpedition.liste(statut)); } catch (e) { setError(e.message); }
  }, [statut]);
  useEffect(() => { charger(); }, [charger]);
  useEffect(() => { api.referentiels.livreurs().then(setLivreurs).catch(() => {}); }, []);
  const maj = (id, k, v) => setSaisie((s) => ({ ...s, [id]: { ...s[id], [k]: v } }));
  const enregistrerReel = async (f) => {
    const s = saisie[f.id] || {};
    if (s.reel === undefined || s.reel === "") { setError("Saisis le coût réel."); return; }
    try { await api.fraisExpedition.reel(f.id, Number(s.reel), s.livreurId || f.livreurId || undefined); setSaisie((x) => ({ ...x, [f.id]: {} })); charger(); } catch (e) { setError(e.message); }
  };
  return (
    <div>
      <div className="flex gap-2 mb-4 flex-wrap">
        {Object.entries(STATUT_FRAIS).map(([k, t]) => (
          <button key={k} type="button" onClick={() => setStatut(k)} className="px-3 py-1.5 rounded-lg text-sm"
            style={statut === k ? { background: t[2], color: t[1], border: `1px solid ${t[1]}` } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>{t[0]}</button>
        ))}
      </div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      {!lignes.length && <p className="text-sm py-4" style={{ color: "#6B5D52" }}>Aucune expédition dans cette liste.</p>}
      <div className="space-y-3">
        {lignes.map((f) => (
          <div key={f.id} className="rounded-xl p-4" style={carte}>
            <div className="flex justify-between flex-wrap gap-2">
              <div>
                <p className="text-sm font-medium">{f.vente?.numero} · {f.vente?.expeditionLieu || "—"} <span className="text-xs" style={{ color: "#6B5D52" }}>({f.vente?.boutique}, {dateFr(f.vente?.date)})</span></p>
                <p className="text-xs" style={{ color: "#6B5D52" }}>{f.vente?.client?.nomPrenoms || "Cliente non précisée"}{f.livreurNom ? ` · livreur ${f.livreurNom}` : ""}</p>
              </div>
              <Pastille t={STATUT_FRAIS[f.statut]} />
            </div>
            <p className="text-sm mt-2">Estimé <strong>{fmt(f.estime)} F</strong> · payé par la cliente <strong>{fmt(f.partCliente)} F</strong>
              {f.coutReel != null && <> · coût réel <strong>{fmt(f.coutReel)} F</strong> (écart {f.ecart > 0 ? "+" : ""}{fmt(f.ecart)} F)</>}
              {" "}· à la charge de la boutique <strong>{fmt(f.coutBoutique)} F</strong>{f.coutReel == null ? " (estimation)" : ""}</p>
            {f.statut !== "CLOTUREE" && (
              <div className="flex flex-wrap items-end gap-3 mt-3">
                <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Coût réel (F)</label>
                  <input type="number" min="0" inputMode="numeric" value={saisie[f.id]?.reel ?? (f.coutReel ?? "")} onChange={(e) => maj(f.id, "reel", e.target.value)} style={{ ...selectStyle, width: 130 }} /></div>
                <div><label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Livreur</label>
                  <select value={saisie[f.id]?.livreurId ?? (f.livreurId || "")} onChange={(e) => maj(f.id, "livreurId", e.target.value)} style={selectStyle}>
                    <option value="">—</option>{livreurs.filter((l) => l.actif !== false).map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
                  </select></div>
                <button type="button" onClick={() => enregistrerReel(f)} style={bouton()}>{f.statut === "EN_COURS" ? "Enregistrer le coût réel" : "Corriger le coût réel"}</button>
                {estAdmin && f.statut === "A_REMBOURSER" && <button type="button" onClick={() => setConfirmer(f)} style={bouton("#3F6B4A")}>Le livreur est remboursé</button>}
              </div>
            )}
          </div>
        ))}
      </div>
      {confirmer && <ConfirmModal title="Livreur remboursé ?" message={`La dépense « Frais d'expédition » de ${fmt(confirmer.coutReel)} F sera enregistrée pour la vente ${confirmer.vente?.numero}.`}
        onCancel={() => setConfirmer(null)} onConfirm={async () => { try { await api.fraisExpedition.rembourser(confirmer.id); setConfirmer(null); charger(); } catch (e) { setError(e.message); setConfirmer(null); } }} />}
      <p className="text-xs mt-4" style={{ color: "#8A7B6F" }}>Le coût réel se saisit au retour du livreur. Le remboursement du livreur peut aussi se faire dans sa remise de fin de journée (onglet suivant).</p>
    </div>
  );
}

// Réduit la photo avant l'envoi (taille raisonnable pour la base de données).
function reduirePhoto(fichier, max = 1000, qualite = 0.6) {
  return new Promise((resolve, reject) => {
    const lecteur = new FileReader();
    lecteur.onerror = () => reject(new Error("Photo illisible."));
    lecteur.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error("Photo illisible."));
      img.onload = () => {
        const k = Math.min(1, max / Math.max(img.width, img.height));
        const c = document.createElement("canvas"); c.width = Math.round(img.width * k); c.height = Math.round(img.height * k);
        c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL("image/jpeg", qualite));
      };
      img.src = lecteur.result;
    };
    lecteur.readAsDataURL(fichier);
  });
}

// ── Remises de fin de journée ────────────────────────────────────────────────
function Remises({ estAdmin }) {
  const [remises, setRemises] = useState([]);
  const [livreurs, setLivreurs] = useState([]);
  const [ouverte, setOuverte] = useState(null);
  const [nouvelle, setNouvelle] = useState(null);
  const [error, setError] = useState("");
  const charger = useCallback(async () => { try { setRemises(await api.remisesLivreurs.liste()); } catch (e) { setError(e.message); } }, []);
  useEffect(() => { charger(); api.referentiels.livreurs().then(setLivreurs).catch(() => {}); }, [charger]);
  const creer = async () => {
    try {
      const r = await api.remisesLivreurs.creer({ livreurId: nouvelle.livreurId, jour: nouvelle.jour, encaisse: Number(nouvelle.encaisse) || 0, verse: nouvelle.verse === "" ? Number(nouvelle.encaisse) || 0 : Number(nouvelle.verse) || 0, boutique: nouvelle.boutique });
      setNouvelle(null); await charger(); setOuverte(r.id);
    } catch (e) { setError(e.message); }
  };
  return (
    <div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      <button type="button" onClick={() => setNouvelle({ livreurId: "", jour: jourIso(new Date()), encaisse: "", verse: "", boutique: BOUTIQUES[0] })} style={bouton()} className="mb-4 inline-flex items-center gap-2"><Plus size={14} /> Nouvelle remise</button>
      {nouvelle && (
        <div className="rounded-xl p-4 mb-4" style={carte}>
          <div className="grid sm:grid-cols-5 gap-3">
            <Field label="Livreur"><select value={nouvelle.livreurId} onChange={(e) => setNouvelle({ ...nouvelle, livreurId: e.target.value })} style={inputStyle}><option value="">—</option>{livreurs.filter((l) => l.actif !== false).map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}</select></Field>
            <Field label="Jour"><input type="date" value={nouvelle.jour} onChange={(e) => setNouvelle({ ...nouvelle, jour: e.target.value })} style={inputStyle} /></Field>
            <Field label="Boutique"><select value={nouvelle.boutique} onChange={(e) => setNouvelle({ ...nouvelle, boutique: e.target.value })} style={inputStyle}>{BOUTIQUES.map((b) => <option key={b}>{b}</option>)}</select></Field>
            <Field label="Encaissé (F)"><input type="number" min="0" inputMode="numeric" value={nouvelle.encaisse} onChange={(e) => setNouvelle({ ...nouvelle, encaisse: e.target.value })} style={inputStyle} /></Field>
            <Field label="Remis en main propre (F)"><input type="number" min="0" inputMode="numeric" placeholder="= encaissé" value={nouvelle.verse} onChange={(e) => setNouvelle({ ...nouvelle, verse: e.target.value })} style={inputStyle} /></Field>
          </div>
          <p className="text-xs mt-2" style={{ color: "#6B5D52" }}>S'il garde sur place ce que la boutique lui doit, remets seulement le reste : la différence sera retenue sur ce qu'on lui doit.</p>
          <div className="flex gap-2 mt-3"><button type="button" onClick={creer} disabled={!nouvelle.livreurId} style={{ ...bouton(), opacity: nouvelle.livreurId ? 1 : 0.5 }}>Créer la remise</button><button type="button" onClick={() => setNouvelle(null)} style={contour}>Annuler</button></div>
        </div>
      )}
      {!remises.length && <p className="text-sm py-4" style={{ color: "#6B5D52" }}>Aucune remise enregistrée.</p>}
      <div className="space-y-2">
        {remises.map((r) => (
          <button key={r.id} type="button" onClick={() => setOuverte(r.id)} className="w-full text-left rounded-xl p-3 flex justify-between items-center flex-wrap gap-2" style={carte}>
            <span className="text-sm"><strong>{r.livreur?.nom}</strong> · {dateFr(r.jour)} · encaissé {fmt(r.encaisse)} F · frais {fmt(r.fraisValides)} F{r.nbAVerifier > 0 ? ` (+${r.nbAVerifier} à vérifier)` : ""}</span>
            <span className="text-sm flex items-center gap-2">
              {r.statut === "VALIDEE" ? <strong style={{ color: r.solde > 0 ? "#B04A3B" : "#3F6B4A" }}>{r.solde > 0 ? `On lui doit ${fmt(r.solde)} F` : r.solde < 0 ? `Il doit ${fmt(-r.solde)} F` : "Soldée"}</strong> : <Pastille t={["Ouverte", "#8A6A22", "#FBF3E3"]} />}
            </span>
          </button>
        ))}
      </div>
      {ouverte && <RemiseDetail id={ouverte} estAdmin={estAdmin} onClose={() => { setOuverte(null); charger(); }} />}
    </div>
  );
}

function RemiseDetail({ id, estAdmin, onClose }) {
  const [r, setR] = useState(null);
  const [error, setError] = useState("");
  const [bon, setBon] = useState({ libelle: "", montant: "", preuve: "" });
  const [aRembourser, setARembourser] = useState([]);
  const [refus, setRefus] = useState({});
  const [apercu, setApercu] = useState(null);
  const photo = useRef(null);
  const recharger = useCallback(async () => { try { setR(await api.remisesLivreurs.lire(id)); } catch (e) { setError(e.message); } }, [id]);
  useEffect(() => { recharger(); }, [recharger]);
  useEffect(() => { if (r?.livreurId && r.statut === "OUVERTE") api.remisesLivreurs.fraisARembourser(r.livreurId).then(setARembourser).catch(() => {}); }, [r?.livreurId, r?.statut, r?.bons?.length]);
  const agir = (f) => async (...a) => { try { setError(""); const x = await f(...a); if (x && x.id) setR(x); else await recharger(); } catch (e) { setError(e.message); } };
  const ouvrirPhoto = async (fichier) => { if (!fichier) return; try { setBon((b) => ({ ...b, preuve: "" })); setBon((b) => ({ ...b })); const p = await reduirePhoto(fichier); setBon((b) => ({ ...b, preuve: p })); } catch (e) { setError(e.message); } };
  if (!r) return <div className="fixed inset-0 flex items-center justify-center z-20" style={{ background: "rgba(43,35,32,0.45)" }}><div className="rounded-xl p-6" style={{ background: "#FFFDF9" }}>Chargement…</div></div>;
  const ouverte = r.statut === "OUVERTE";
  return (
    <div className="fixed inset-0 flex items-center justify-center p-4 z-20" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className="rounded-xl p-6 max-w-2xl w-full max-h-[92vh] overflow-y-auto" style={{ background: "#FFFDF9" }}>
        <div className="flex justify-between items-start mb-3">
          <div><p className="font-display text-lg font-semibold">{r.livreur?.nom} · {dateFr(r.jour)}</p><p className="text-xs" style={{ color: "#6B5D52" }}>{r.boutique || ""} · remise {ouverte ? "ouverte" : "validée"}</p></div>
          <button onClick={onClose}><X size={18} color="#6B5D52" /></button>
        </div>
        <ErrorBanner error={error} onClose={() => setError("")} />
        <div className="grid grid-cols-3 gap-3 mb-4">
          <Field label="Encaissé (F)"><input type="number" min="0" disabled={!ouverte && !estAdmin} defaultValue={r.encaisse} onBlur={(e) => Number(e.target.value) !== r.encaisse && agir(api.remisesLivreurs.modifier)(r.id, { encaisse: Number(e.target.value) || 0 })} style={inputStyle} /></Field>
          <Field label="Remis en main propre (F)"><input type="number" min="0" disabled={!ouverte && !estAdmin} defaultValue={r.verse} onBlur={(e) => Number(e.target.value) !== r.verse && agir(api.remisesLivreurs.modifier)(r.id, { verse: Number(e.target.value) || 0 })} style={inputStyle} /></Field>
          <Field label="Rémunération (F)"><input type="number" min="0" disabled={!estAdmin || !ouverte} defaultValue={r.remuneration} onBlur={(e) => Number(e.target.value) !== r.remuneration && agir(api.remisesLivreurs.modifier)(r.id, { remuneration: Number(e.target.value) || 0 })} style={inputStyle} /></Field>
        </div>

        <p className="text-sm font-medium mb-2">Bons de frais avancés par le livreur</p>
        {!r.bons.length && <p className="text-sm mb-2" style={{ color: "#6B5D52" }}>Aucun bon pour le moment.</p>}
        <div className="space-y-2 mb-3">
          {r.bons.map((b) => (
            <div key={b.id} className="rounded-lg p-3" style={{ background: "#FAF7F2", border: "1px solid #EFE7D9" }}>
              <div className="flex justify-between items-center gap-2 flex-wrap">
                <span className="text-sm">{b.libelle} · <strong>{fmt(b.montant)} F</strong></span>
                <span className="flex items-center gap-2"><Pastille t={STATUT_BON[b.statut]} />
                  {b.aPreuve && <button type="button" className="text-xs underline" style={{ color: "#8C3B2E" }} onClick={async () => { try { setApercu((await api.remisesLivreurs.preuve(b.id)).preuve); } catch (e) { setError(e.message); } }}>Voir la preuve</button>}
                  {ouverte && <button type="button" onClick={() => agir(api.remisesLivreurs.supprimerBon)(b.id)} title="Retirer"><Trash2 size={14} color="#B04A3B" /></button>}
                </span>
              </div>
              {b.statut === "REFUSE" && b.motifRefus && <p className="text-xs mt-1" style={{ color: "#B04A3B" }}>Refusé : {b.motifRefus}</p>}
              {estAdmin && ouverte && b.statut !== "VALIDE" && (
                <div className="flex gap-2 mt-2 flex-wrap items-center">
                  <button type="button" onClick={() => agir(api.remisesLivreurs.statutBon)(b.id, "VALIDE")} style={bouton("#3F6B4A")} className="inline-flex items-center gap-1"><Check size={13} /> Valider</button>
                  <input placeholder="Raison du refus" value={refus[b.id] || ""} onChange={(e) => setRefus({ ...refus, [b.id]: e.target.value })} style={{ ...selectStyle, width: 190 }} />
                  <button type="button" onClick={() => agir(api.remisesLivreurs.statutBon)(b.id, "REFUSE", refus[b.id] || "")} style={contour}>Refuser</button>
                </div>
              )}
            </div>
          ))}
        </div>

        {ouverte && (
          <div className="rounded-lg p-3 mb-4" style={{ border: "1px dashed #DDD3C4" }}>
            <div className="grid sm:grid-cols-3 gap-2 items-end">
              <input placeholder="Motif (ex. gare de Bouaké)" value={bon.libelle} onChange={(e) => setBon({ ...bon, libelle: e.target.value })} style={{ ...selectStyle, width: "100%" }} />
              <input type="number" min="0" inputMode="numeric" placeholder="Montant (F)" value={bon.montant} onChange={(e) => setBon({ ...bon, montant: e.target.value })} style={{ ...selectStyle, width: "100%" }} />
              <div className="flex gap-2">
                <input ref={photo} type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => ouvrirPhoto(e.target.files?.[0])} />
                <button type="button" onClick={() => photo.current?.click()} style={contour} className="inline-flex items-center gap-1"><Camera size={14} /> {bon.preuve ? "Photo prise ✓" : "Photo du reçu"}</button>
                <button type="button" onClick={async () => { await agir(api.remisesLivreurs.ajouterBon)(r.id, { libelle: bon.libelle, montant: Number(bon.montant), preuve: bon.preuve || undefined }); setBon({ libelle: "", montant: "", preuve: "" }); }} style={bouton()}>Ajouter</button>
              </div>
            </div>
            {aRembourser.length > 0 && (
              <div className="mt-3"><p className="text-xs mb-1" style={{ color: "#6B5D52" }}>Frais d'expédition à rembourser (coût réel déjà saisi) :</p>
                <div className="flex gap-2 flex-wrap">{aRembourser.map((f) => (
                  <button key={f.id} type="button" onClick={() => agir(api.remisesLivreurs.ajouterBon)(r.id, { fraisExpeditionId: f.id })} style={contour}>+ {f.numero} {f.lieu ? `· ${f.lieu}` : ""} · {fmt(f.coutReel)} F</button>
                ))}</div></div>
            )}
          </div>
        )}

        <div className="rounded-lg p-3 mb-4 text-sm space-y-1" style={{ background: "#F1E9DC" }}>
          <div className="flex justify-between"><span>Frais validés</span><strong>{fmt(r.fraisValides)} F</strong></div>
          <div className="flex justify-between"><span>Rémunération</span><strong>{fmt(r.remuneration)} F</strong></div>
          <div className="flex justify-between"><span>Total dû au livreur</span><strong>{fmt(r.du)} F</strong></div>
          <div className="flex justify-between"><span>Gardé sur ce qu'il a encaissé</span><strong>− {fmt(r.retenu)} F</strong></div>
          <div className="flex justify-between"><span>Déjà payé</span><strong>− {fmt(r.paye)} F</strong></div>
          <div className="flex justify-between pt-1" style={{ borderTop: "1px solid #DDD3C4" }}><span><strong>{r.solde > 0 ? "La boutique doit encore" : r.solde < 0 ? "Le livreur doit à la boutique" : "Solde"}</strong></span><strong style={{ color: r.solde > 0 ? "#B04A3B" : "#3F6B4A" }}>{fmt(Math.abs(r.solde))} F</strong></div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {estAdmin && ouverte && <button type="button" onClick={() => agir(api.remisesLivreurs.valider)(r.id)} style={bouton()}>Valider la remise</button>}
          {estAdmin && !ouverte && r.solde > 0 && <button type="button" onClick={() => agir(api.remisesLivreurs.payer)(r.id)} style={bouton("#3F6B4A")} className="inline-flex items-center gap-1"><Banknote size={14} /> Payer {fmt(r.solde)} F au livreur</button>}
          {estAdmin && !ouverte && r.paye === 0 && <button type="button" onClick={() => agir(api.remisesLivreurs.rouvrir)(r.id)} style={contour}>Rouvrir</button>}
          {ouverte && !estAdmin && <p className="text-xs" style={{ color: "#6B5D52" }}>L'administratrice vérifie les bons puis valide la remise.</p>}
        </div>
      </div>
      {apercu && (
        <div className="fixed inset-0 flex items-center justify-center p-4 z-30" style={{ background: "rgba(43,35,32,0.7)" }} onClick={() => setApercu(null)}>
          <img src={apercu} alt="Preuve du bon de frais" style={{ maxWidth: "92vw", maxHeight: "88vh", borderRadius: 8 }} />
        </div>
      )}
    </div>
  );
}

// ── À payer (administratrice) ────────────────────────────────────────────────
function APayer() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");
  const charger = useCallback(async () => { try { setD(await api.remisesLivreurs.aPayer()); } catch (e) { setError(e.message); } }, []);
  useEffect(() => { charger(); }, [charger]);
  const payer = async (id) => { try { await api.remisesLivreurs.payer(id); charger(); } catch (e) { setError(e.message); } };
  if (!d) return <ErrorBanner error={error} onClose={() => setError("")} />;
  return (
    <div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      <div className="rounded-xl p-4 mb-4" style={carte}><p className="text-xs" style={{ color: "#6B5D52" }}>Total à payer aux livreurs</p><p className="font-display text-3xl font-semibold">{fmt(d.total)} F</p></div>
      {!d.livreurs.length && <p className="text-sm" style={{ color: "#6B5D52" }}>Rien à payer : tous les livreurs sont à jour.</p>}
      <div className="space-y-3">
        {d.livreurs.map((l) => (
          <div key={l.livreurId} className="rounded-xl p-4" style={carte}>
            <div className="flex justify-between"><strong>{l.nom}</strong><strong style={{ color: "#B04A3B" }}>{fmt(l.total)} F</strong></div>
            <div className="mt-2 space-y-1">{l.jours.map((j) => (
              <div key={j.id} className="flex justify-between items-center text-sm"><span>Journée du {dateFr(j.jour)}</span>
                <span className="flex items-center gap-3">{fmt(j.solde)} F <button type="button" onClick={() => payer(j.id)} style={bouton("#3F6B4A")}>Payé</button></span></div>
            ))}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function Comptes() {
  const [l, setL] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { api.remisesLivreurs.comptes().then(setL).catch((e) => setError(e.message)); }, []);
  return (
    <div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      <div className="rounded-xl p-4" style={carte}>
        <table className="w-full text-sm"><thead><tr style={{ color: "#6B5D52" }}><th className="text-left py-2">Livreur</th><th className="text-right">Remises validées</th><th className="text-right">Dernière</th><th className="text-right">Solde</th></tr></thead>
          <tbody>{l.map((c) => (
            <tr key={c.id} style={{ borderTop: "1px solid #EFE7D9" }}><td className="py-2">{c.nom}</td><td className="text-right">{c.nbRemises}</td><td className="text-right">{dateFr(c.derniere)}</td>
              <td className="text-right font-medium" style={{ color: c.solde > 0 ? "#B04A3B" : c.solde < 0 ? "#8A6A22" : "#3F6B4A" }}>{c.solde > 0 ? `On lui doit ${fmt(c.solde)} F` : c.solde < 0 ? `Il doit ${fmt(-c.solde)} F` : "À jour"}</td></tr>
          ))}</tbody></table>
      </div>
    </div>
  );
}
