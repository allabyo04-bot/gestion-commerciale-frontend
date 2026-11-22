import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { fmt } from "../constants.js";
import { ErrorBanner, selectStyle } from "../components/Shared.jsx";

// Lot 7 : fournisseurs, commandes, livraisons, paiements, échéancier, alertes et trésorerie (administratrice seulement).
const C = { carte: "#FFFFFF", bordure: "#EAE1D2", doux: "#6B5D52", accent: "#8C3B2E" };
const cadre = { background: C.carte, border: `1px solid ${C.bordure}` };
const pill = (actif) => (actif ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" });
const MODES = ["Virement", "Transfert international", "Espèces", "Chèque", "Mobile money", "Lettre de crédit"];
const STATUT = {
  PAYEE: { label: "Payée", couleur: "#3F6B4A", fond: "#E9F0EA" },
  A_PAYER: { label: "À venir", couleur: "#6B5D52", fond: "#F1E9DC" },
  BIENTOT: { label: "Sous 7 jours", couleur: "#A8823D", fond: "#FDF3E3" },
  EN_RETARD: { label: "En retard", couleur: "#B04A3B", fond: "#FBEAE7" },
};
const puce = (s) => { const x = STATUT[s] || STATUT.A_PAYER; return <span className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap" style={{ background: x.fond, color: x.couleur }}>{x.label}</span>; };
const jour = (d) => new Date(d).toLocaleDateString("fr-FR");
const iso = (d = new Date()) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
const pc = (v) => (v == null ? "—" : `${String(v).replace(".", ",")} %`);
const chiffres = (v) => v.replace(/\D/g, "");

export default function FournisseursSection() {
  const [tab, setTab] = useState("situation");
  const [error, setError] = useState("");
  const [fournisseurs, setFournisseurs] = useState([]);
  const [alertes, setAlertes] = useState(null);
  const charger = useCallback(async () => {
    try {
      const [f, a] = await Promise.all([api.fournisseurs.list(), api.fournisseurs.alertes()]);
      setFournisseurs(f); setAlertes(a);
    } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { charger(); }, [charger]);

  return (
    <div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      <div className="flex gap-2 mb-6 flex-wrap">
        {[["situation", "Situation"], ["commandes", "Commandes"], ["fournisseurs", "Fournisseurs"], ["tresorerie", "Trésorerie"]].map(([id, l]) => (
          <button key={id} onClick={() => setTab(id)} className="px-4 py-2 rounded-full text-sm font-medium" style={pill(tab === id)}>{l}</button>
        ))}
      </div>
      {tab === "situation" && <Situation fournisseurs={fournisseurs} alertes={alertes} onError={setError} />}
      {tab === "commandes" && <Commandes fournisseurs={fournisseurs.filter((f) => f.actif)} onChanged={charger} onError={setError} />}
      {tab === "fournisseurs" && <ListeFournisseurs fournisseurs={fournisseurs} onChanged={charger} onError={setError} />}
      {tab === "tresorerie" && <Tresorerie onError={setError} />}
    </div>
  );
}

function Situation({ fournisseurs, alertes, onError }) {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [date, setDate] = useState(iso());
  const [synthese, setSynthese] = useState(null);
  useEffect(() => {
    api.fournisseurs.synthese({ annee, date }).then(setSynthese).catch((e) => onError(e.message));
  }, [annee, date, onError]);

  return (
    <div>
      {alertes && alertes.liste.length > 0 && (
        <div className="rounded-2xl p-4 mb-5" style={{ background: "#FDF3E3", border: "1px solid #E8D3A8" }}>
          <p className="text-sm font-semibold mb-2" style={{ color: "#8A5A12" }}>Règlements à faire ({fmt(alertes.montant)} F)</p>
          <ul className="text-sm space-y-1">
            {alertes.liste.map((a, i) => (
              <li key={i}><strong>{a.fournisseur}</strong> — {a.libelle} : {fmt(a.reste)} F, {a.joursRestants < 0 ? `en retard de ${-a.joursRestants} j` : a.joursRestants === 0 ? "aujourd'hui" : `dans ${a.joursRestants} j`} ({jour(a.echeance)}) {puce(a.statut)}</li>
            ))}
          </ul>
        </div>
      )}

      <p className="text-xs font-mono uppercase tracking-wide mb-2" style={{ color: C.accent }}>Situation en temps réel par fournisseur</p>
      <div className="rounded-2xl overflow-x-auto mb-6" style={cadre}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F1E9DC", color: C.doux }}>
              <th className="text-left px-4 py-2">Fournisseur</th>
              <th className="text-right px-4 py-2">Paires commandées</th>
              <th className="text-right px-4 py-2">Livrées</th>
              <th className="text-right px-4 py-2">Reste à livrer</th>
              <th className="text-right px-4 py-2">Montant</th>
              <th className="text-right px-4 py-2">Payé</th>
              <th className="text-right px-4 py-2">Solde dû</th>
              <th className="text-left px-4 py-2">Prochaine échéance</th>
            </tr>
          </thead>
          <tbody>
            {fournisseurs.filter((f) => f.actif || f.nbCommandes).map((f) => (
              <tr key={f.id} style={{ borderTop: "1px solid #EFE7D9" }}>
                <td className="px-4 py-2"><span className="font-medium">{f.nom}</span> <span className="text-xs" style={{ color: C.doux }}>{f.type === "INTERNATIONAL" ? "international" : "local"}</span></td>
                <td className="text-right px-4 py-2">{fmt(f.quantite)}</td>
                <td className="text-right px-4 py-2">{fmt(f.livre)}</td>
                <td className="text-right px-4 py-2">{fmt(f.resteALivrer)}</td>
                <td className="text-right px-4 py-2">{fmt(f.montantTotal)} F</td>
                <td className="text-right px-4 py-2">{fmt(f.paye)} F</td>
                <td className="text-right px-4 py-2 font-medium" style={{ color: f.solde > 0 ? "#B04A3B" : "#3F6B4A" }}>{fmt(f.solde)} F</td>
                <td className="px-4 py-2 text-xs">{f.prochaineEcheance ? <>{jour(f.prochaineEcheance.echeance)} · {fmt(f.prochaineEcheance.reste)} F {puce(f.prochaineEcheance.statut)}</> : "—"}</td>
              </tr>
            ))}
            {fournisseurs.length === 0 && <tr><td colSpan={8} className="px-4 py-6 text-center" style={{ color: C.doux }}>Aucun fournisseur. Ajoute-en dans l'onglet « Fournisseurs ».</td></tr>}
          </tbody>
        </table>
      </div>

      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <p className="text-xs font-mono uppercase tracking-wide" style={{ color: C.accent }}>Paires commandées dans l'année et % livré à une date</p>
        <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} style={selectStyle}>
          {[annee - 1, annee, annee + 1].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <label className="text-xs" style={{ color: C.doux }}>Livré au</label>
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm" style={{ border: "1px solid #DDD3C4" }} />
      </div>
      <div className="rounded-2xl overflow-x-auto" style={cadre}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F1E9DC", color: C.doux }}>
              <th className="text-left px-4 py-2">Fournisseur</th><th className="text-right px-4 py-2">Commandes</th><th className="text-right px-4 py-2">Paires commandées</th>
              <th className="text-right px-4 py-2">Livrées</th><th className="text-right px-4 py-2">Reste à recevoir</th><th className="text-right px-4 py-2">% livré</th>
            </tr>
          </thead>
          <tbody>
            {synthese?.fournisseurs.map((f) => (
              <tr key={f.fournisseurId} style={{ borderTop: "1px solid #EFE7D9" }}>
                <td className="px-4 py-2">{f.fournisseur}</td><td className="text-right px-4 py-2">{f.commandes}</td><td className="text-right px-4 py-2">{fmt(f.commandees)}</td>
                <td className="text-right px-4 py-2">{fmt(f.livrees)}</td><td className="text-right px-4 py-2">{fmt(f.resteARecevoir)}</td><td className="text-right px-4 py-2">{pc(f.pourcentageLivre)}</td>
              </tr>
            ))}
            {synthese && synthese.fournisseurs.length === 0 && <tr><td colSpan={6} className="px-4 py-6 text-center" style={{ color: C.doux }}>Aucune commande en {annee}.</td></tr>}
          </tbody>
          {synthese && synthese.fournisseurs.length > 0 && (
            <tfoot><tr style={{ borderTop: "2px solid #2B2320", fontWeight: 600 }}>
              <td className="px-4 py-2" colSpan={2}>Total</td><td className="text-right px-4 py-2">{fmt(synthese.total.commandees)}</td><td className="text-right px-4 py-2">{fmt(synthese.total.livrees)}</td>
              <td className="text-right px-4 py-2">{fmt(Math.max(0, synthese.total.commandees - synthese.total.livrees))}</td><td className="text-right px-4 py-2">{pc(synthese.total.commandees ? Math.round((synthese.total.livrees / synthese.total.commandees) * 1000) / 10 : null)}</td>
            </tr></tfoot>
          )}
        </table>
      </div>
    </div>
  );
}

function ListeFournisseurs({ fournisseurs, onChanged, onError }) {
  const vide = { nom: "", type: "LOCAL", pays: "", contact: "" };
  const [f, setF] = useState(vide);
  const agir = async (fn) => { try { await fn(); onChanged(); } catch (e) { onError(e.message); } };
  return (
    <div>
      <div className="rounded-2xl p-4 mb-5 grid sm:grid-cols-5 gap-2 items-end" style={cadre}>
        <input placeholder="Nom du fournisseur" value={f.nom} onChange={(e) => setF({ ...f, nom: e.target.value })} className="px-3 py-2 rounded-lg text-sm sm:col-span-2" style={{ border: "1px solid #DDD3C4" }} />
        <select value={f.type} onChange={(e) => setF({ ...f, type: e.target.value })} style={selectStyle}><option value="LOCAL">Local</option><option value="INTERNATIONAL">International</option></select>
        <input placeholder="Pays / ville" value={f.pays} onChange={(e) => setF({ ...f, pays: e.target.value })} className="px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid #DDD3C4" }} />
        <button onClick={() => f.nom.trim() && agir(async () => { await api.fournisseurs.creer(f); setF(vide); })} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: C.accent, color: "#FBF3EC" }}>Ajouter</button>
        <input placeholder="Contact (téléphone, e-mail…)" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} className="px-3 py-2 rounded-lg text-sm sm:col-span-5" style={{ border: "1px solid #DDD3C4" }} />
      </div>
      <div className="rounded-2xl overflow-hidden" style={cadre}>
        {fournisseurs.map((x) => (
          <div key={x.id} className="flex items-center justify-between px-4 py-3 text-sm" style={{ borderTop: "1px solid #EFE7D9", opacity: x.actif ? 1 : 0.55 }}>
            <div>
              <p className="font-medium">{x.nom} <span className="text-xs font-normal" style={{ color: C.doux }}>{x.type === "INTERNATIONAL" ? "International" : "Local"}{x.pays ? ` · ${x.pays}` : ""}</span></p>
              {x.contact && <p className="text-xs" style={{ color: C.doux }}>{x.contact}</p>}
            </div>
            <div className="flex items-center gap-3 text-xs">
              <span style={{ color: C.doux }}>{x.nbCommandes} commande(s)</span>
              <button className="underline" onClick={() => agir(() => api.fournisseurs.modifier(x.id, { actif: !x.actif }))}>{x.actif ? "Désactiver" : "Réactiver"}</button>
              <button className="underline" style={{ color: "#B04A3B" }} onClick={() => window.confirm(`Supprimer ${x.nom} ?`) && agir(() => api.fournisseurs.supprimer(x.id))}>Supprimer</button>
            </div>
          </div>
        ))}
        {fournisseurs.length === 0 && <p className="px-4 py-6 text-center text-sm" style={{ color: C.doux }}>Aucun fournisseur pour l'instant.</p>}
      </div>
    </div>
  );
}

function Commandes({ fournisseurs, onChanged, onError }) {
  const [annee, setAnnee] = useState(new Date().getFullYear());
  const [filtre, setFiltre] = useState("");
  const [cmds, setCmds] = useState([]);
  const [ouvert, setOuvert] = useState(null);
  const [nouvelle, setNouvelle] = useState(false);
  const charger = useCallback(async () => {
    try { setCmds(await api.fournisseurs.commandes({ annee, ...(filtre ? { fournisseurId: filtre } : {}) })); } catch (e) { onError(e.message); }
  }, [annee, filtre, onError]);
  useEffect(() => { charger(); }, [charger]);
  const apres = () => { charger(); onChanged(); };

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <select value={filtre} onChange={(e) => setFiltre(e.target.value)} style={selectStyle}>
          <option value="">Tous les fournisseurs</option>
          {fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}
        </select>
        <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} style={selectStyle}>
          {[annee - 1, annee, annee + 1].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <button onClick={() => setNouvelle(!nouvelle)} className="px-4 py-2 rounded-lg text-sm font-medium ml-auto" style={{ background: C.accent, color: "#FBF3EC" }}>{nouvelle ? "Fermer" : "+ Nouvelle commande"}</button>
      </div>
      {nouvelle && <FormCommande fournisseurs={fournisseurs} onDone={() => { setNouvelle(false); apres(); }} onError={onError} />}
      <div className="space-y-3">
        {cmds.map((c) => (
          <div key={c.id} className="rounded-2xl" style={cadre}>
            <button onClick={() => setOuvert(ouvert === c.id ? null : c.id)} className="w-full text-left px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <span><strong>{c.fournisseur}</strong> — {c.reference || c.description || "Commande"} <span className="text-xs" style={{ color: C.doux }}>({jour(c.dateCommande)})</span></span>
              <span className="text-xs flex gap-4" style={{ color: C.doux }}>
                <span>{fmt(c.livre)} / {fmt(c.quantite)} paires ({pc(c.pourcentageLivre)})</span>
                <span>Payé {fmt(c.paye)} / {fmt(c.montantTotal)} F</span>
                {c.echeances.some((e) => e.statut === "EN_RETARD") && puce("EN_RETARD")}
              </span>
            </button>
            {ouvert === c.id && <DetailCommande c={c} onChanged={apres} onError={onError} />}
          </div>
        ))}
        {cmds.length === 0 && <p className="text-sm py-6 text-center" style={{ color: C.doux }}>Aucune commande pour cette sélection.</p>}
      </div>
    </div>
  );
}

function FormCommande({ fournisseurs, onDone, onError }) {
  const [v, setV] = useState({ fournisseurId: "", reference: "", description: "", quantite: "", montantTotal: "", dateCommande: iso() });
  const champ = "px-3 py-2 rounded-lg text-sm";
  const enregistrer = async () => {
    if (!v.fournisseurId || !v.quantite || !v.montantTotal) { onError("Fournisseur, quantité et montant total sont obligatoires."); return; }
    try { await api.fournisseurs.creerCommande({ ...v, quantite: Number(v.quantite), montantTotal: Number(v.montantTotal) }); onDone(); } catch (e) { onError(e.message); }
  };
  return (
    <div className="rounded-2xl p-4 mb-4 grid sm:grid-cols-3 gap-2 items-end" style={cadre}>
      <select value={v.fournisseurId} onChange={(e) => setV({ ...v, fournisseurId: e.target.value })} style={selectStyle}><option value="">— Fournisseur —</option>{fournisseurs.map((f) => <option key={f.id} value={f.id}>{f.nom}</option>)}</select>
      <input placeholder="Référence (n° de commande)" value={v.reference} onChange={(e) => setV({ ...v, reference: e.target.value })} className={champ} style={{ border: "1px solid #DDD3C4" }} />
      <input type="date" value={v.dateCommande} onChange={(e) => setV({ ...v, dateCommande: e.target.value })} className={champ} style={{ border: "1px solid #DDD3C4" }} />
      <input placeholder="Quantité commandée (paires / articles)" value={v.quantite} inputMode="numeric" onChange={(e) => setV({ ...v, quantite: chiffres(e.target.value) })} className={champ} style={{ border: "1px solid #DDD3C4" }} />
      <input placeholder="Montant total (F CFA)" value={v.montantTotal} inputMode="numeric" onChange={(e) => setV({ ...v, montantTotal: chiffres(e.target.value) })} className={champ} style={{ border: "1px solid #DDD3C4" }} />
      <input placeholder="Article / description" value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} className={champ} style={{ border: "1px solid #DDD3C4" }} />
      <button onClick={enregistrer} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#3F6B4A", color: "#F3F7F3" }}>Enregistrer la commande</button>
    </div>
  );
}

function DetailCommande({ c, onChanged, onError }) {
  const agir = async (fn) => { try { await fn(); onChanged(); } catch (e) { onError(e.message); } };
  const [liv, setLiv] = useState({ quantite: "", date: iso(), notes: "" });
  const [pai, setPai] = useState({ montant: "", date: iso(), mode: MODES[0], reference: "" });
  const [ech, setEch] = useState({ libelle: "", valeur: "", unite: "F", echeance: iso() });
  const champ = { border: "1px solid #DDD3C4" };
  const montantEch = ech.unite === "%" ? Math.round((c.montantTotal * Number(ech.valeur || 0)) / 100) : Number(ech.valeur || 0);

  return (
    <div className="px-4 pb-4 grid lg:grid-cols-3 gap-4 text-sm" style={{ borderTop: "1px solid #EFE7D9" }}>
      <div className="pt-3">
        <p className="font-medium mb-2">Livraisons — reste à recevoir : {fmt(c.resteALivrer)}</p>
        {c.livraisons.map((l) => (
          <div key={l.id} className="flex justify-between text-xs py-0.5"><span>{jour(l.date)} · {fmt(l.quantite)}{l.notes ? ` · ${l.notes}` : ""}</span>
            <button style={{ color: "#B04A3B" }} onClick={() => window.confirm("Supprimer cette livraison ?") && agir(() => api.fournisseurs.supprimerLigne("livraisons", l.id))}>✕</button></div>
        ))}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <input placeholder="Quantité" value={liv.quantite} inputMode="numeric" onChange={(e) => setLiv({ ...liv, quantite: chiffres(e.target.value) })} className="w-24 px-2 py-1 rounded" style={champ} />
          <input type="date" value={liv.date} onChange={(e) => setLiv({ ...liv, date: e.target.value })} className="px-2 py-1 rounded" style={champ} />
          <input placeholder="Article / note" value={liv.notes} onChange={(e) => setLiv({ ...liv, notes: e.target.value })} className="flex-1 min-w-24 px-2 py-1 rounded" style={champ} />
          <button className="px-3 py-1 rounded text-xs" style={{ background: C.accent, color: "#FBF3EC" }}
            onClick={() => liv.quantite && agir(async () => { await api.fournisseurs.ajouterLigne(c.id, "livraisons", { ...liv, quantite: Number(liv.quantite) }); setLiv({ ...liv, quantite: "", notes: "" }); })}>Ajouter</button>
        </div>
      </div>

      <div className="pt-3">
        <p className="font-medium mb-2">Paiements — solde dû : {fmt(c.solde)} F</p>
        {c.paiements.map((p) => (
          <div key={p.id} className="flex justify-between text-xs py-0.5"><span>{jour(p.date)} · {fmt(p.montant)} F · {p.mode || "—"}{p.reference ? ` · ${p.reference}` : ""}</span>
            <button style={{ color: "#B04A3B" }} onClick={() => window.confirm("Supprimer ce paiement ?") && agir(() => api.fournisseurs.supprimerLigne("paiements", p.id))}>✕</button></div>
        ))}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <input placeholder="Montant F" value={pai.montant} inputMode="numeric" onChange={(e) => setPai({ ...pai, montant: chiffres(e.target.value) })} className="w-28 px-2 py-1 rounded" style={champ} />
          <input type="date" value={pai.date} onChange={(e) => setPai({ ...pai, date: e.target.value })} className="px-2 py-1 rounded" style={champ} />
          <select value={pai.mode} onChange={(e) => setPai({ ...pai, mode: e.target.value })} className="px-2 py-1 rounded" style={champ}>{MODES.map((m) => <option key={m}>{m}</option>)}</select>
          <input placeholder="Référence" value={pai.reference} onChange={(e) => setPai({ ...pai, reference: e.target.value })} className="w-28 px-2 py-1 rounded" style={champ} />
          <button className="px-3 py-1 rounded text-xs" style={{ background: C.accent, color: "#FBF3EC" }}
            onClick={() => pai.montant && agir(async () => { await api.fournisseurs.ajouterLigne(c.id, "paiements", { ...pai, montant: Number(pai.montant) }); setPai({ ...pai, montant: "", reference: "" }); })}>Ajouter</button>
        </div>
      </div>

      <div className="pt-3">
        <p className="font-medium mb-2">Échéancier</p>
        {c.echeances.map((e) => (
          <div key={e.id} className="flex justify-between items-center text-xs py-0.5 gap-2"><span>{jour(e.echeance)} · {e.libelle} · {fmt(e.montant)} F</span>
            <span className="flex items-center gap-2">{puce(e.statut)}<button style={{ color: "#B04A3B" }} onClick={() => agir(() => api.fournisseurs.supprimerLigne("echeances", e.id))}>✕</button></span></div>
        ))}
        <div className="flex gap-1.5 mt-2 flex-wrap">
          <input placeholder="Libellé (ex. 30 % à la commande)" value={ech.libelle} onChange={(e) => setEch({ ...ech, libelle: e.target.value })} className="flex-1 min-w-32 px-2 py-1 rounded" style={champ} />
          <input placeholder="Valeur" value={ech.valeur} inputMode="numeric" onChange={(e) => setEch({ ...ech, valeur: chiffres(e.target.value) })} className="w-24 px-2 py-1 rounded" style={champ} />
          <select value={ech.unite} onChange={(e) => setEch({ ...ech, unite: e.target.value })} className="px-2 py-1 rounded" style={champ}><option value="F">F</option><option value="%">%</option></select>
          <input type="date" value={ech.echeance} onChange={(e) => setEch({ ...ech, echeance: e.target.value })} className="px-2 py-1 rounded" style={champ} />
          <button className="px-3 py-1 rounded text-xs" style={{ background: C.accent, color: "#FBF3EC" }}
            onClick={() => ech.libelle.trim() && montantEch > 0 && agir(async () => { await api.fournisseurs.ajouterLigne(c.id, "echeances", { libelle: ech.libelle, montant: montantEch, echeance: ech.echeance }); setEch({ ...ech, libelle: "", valeur: "" }); })}>Ajouter</button>
        </div>
        {ech.unite === "%" && ech.valeur && <p className="text-xs mt-1" style={{ color: C.doux }}>= {fmt(montantEch)} F sur {fmt(c.montantTotal)} F</p>}
      </div>

      <div className="lg:col-span-3 flex justify-end">
        <button className="text-xs underline" style={{ color: "#B04A3B" }} onClick={() => window.confirm("Supprimer cette commande et tout son suivi ?") && agir(() => api.fournisseurs.supprimerCommande(c.id))}>Supprimer la commande</button>
      </div>
    </div>
  );
}

function Tresorerie({ onError }) {
  const [t, setT] = useState(null);
  const [mois, setMois] = useState(3);
  const [solde, setSolde] = useState("");
  const [note, setNote] = useState("");
  const charger = useCallback(async () => {
    try { setT(await api.fournisseurs.tresorerie(mois)); } catch (e) { onError(e.message); }
  }, [mois, onError]);
  useEffect(() => { charger(); }, [charger]);
  const enregistrer = async () => {
    if (solde === "" || isNaN(Number(solde))) return;
    try { await api.fournisseurs.definirSolde({ montant: Number(solde), note }); setSolde(""); setNote(""); charger(); } catch (e) { onError(e.message); }
  };
  return (
    <div>
      <div className="rounded-2xl p-4 mb-5" style={cadre}>
        <p className="text-sm mb-2">
          Solde de départ (banque + caisses) :{" "}
          {t?.soldeDepart ? <strong>{fmt(t.soldeDepart.montant)} F <span className="font-normal text-xs" style={{ color: C.doux }}>au {jour(t.soldeDepart.date)}{t.soldeDepart.note ? ` · ${t.soldeDepart.note}` : ""}</span></strong> : <span style={{ color: "#B04A3B" }}>non saisi</span>}
        </p>
        <div className="flex gap-2 flex-wrap items-center">
          <input placeholder="Nouveau solde (F CFA)" value={solde} inputMode="numeric" onChange={(e) => setSolde(e.target.value.replace(/[^\d-]/g, ""))} className="px-3 py-2 rounded-lg text-sm w-52" style={{ border: "1px solid #DDD3C4" }} />
          <input placeholder="Note (facultatif)" value={note} onChange={(e) => setNote(e.target.value)} className="px-3 py-2 rounded-lg text-sm flex-1 min-w-40" style={{ border: "1px solid #DDD3C4" }} />
          <button onClick={enregistrer} className="px-4 py-2 rounded-lg text-sm font-medium" style={{ background: C.accent, color: "#FBF3EC" }}>Enregistrer le solde</button>
        </div>
      </div>
      {t && t.alertes.length > 0 && (
        <div className="rounded-2xl p-4 mb-5" style={{ background: "#FBEAE7", border: "1px solid #E8B9B1" }}>
          <p className="text-sm font-semibold" style={{ color: "#B04A3B" }}>Risque de manquer de liquidités</p>
          <ul className="text-sm mt-1">{t.alertes.map((a) => <li key={a.mois}>{a.mois} : solde prévu {fmt(a.soldeFin)} F</li>)}</ul>
        </div>
      )}
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm" style={{ color: C.doux }}>Horizon :</span>
        {[3, 6, 12].map((n) => <button key={n} onClick={() => setMois(n)} className="px-3 py-1.5 rounded-full text-xs font-medium" style={pill(mois === n)}>{n} mois</button>)}
      </div>
      {t && (
        <div className="rounded-2xl overflow-x-auto" style={cadre}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: "#F1E9DC", color: C.doux }}>
                <th className="text-left px-4 py-2">Mois</th><th className="text-right px-4 py-2">Entrées (ventes)</th><th className="text-right px-4 py-2">Fournisseurs</th>
                <th className="text-right px-4 py-2">Obligations</th><th className="text-right px-4 py-2">Dépenses courantes</th><th className="text-right px-4 py-2">Net</th><th className="text-right px-4 py-2">Solde fin de mois</th>
              </tr>
            </thead>
            <tbody>
              {t.lignes.map((l) => (
                <tr key={`${l.annee}-${l.mois}`} style={{ borderTop: "1px solid #EFE7D9" }}>
                  <td className="px-4 py-2">{l.nom} {l.annee}</td>
                  <td className="text-right px-4 py-2">{fmt(l.entrees)} F <span className="text-xs" style={{ color: C.doux }}>{l.sourceEntrees === "OBJECTIF" ? "(objectif)" : "(moyenne)"}</span></td>
                  <td className="text-right px-4 py-2">{fmt(l.fournisseurs)} F</td><td className="text-right px-4 py-2">{fmt(l.obligations)} F</td><td className="text-right px-4 py-2">{fmt(l.depensesCourantes)} F</td>
                  <td className="text-right px-4 py-2" style={{ color: l.net >= 0 ? "#3F6B4A" : "#B04A3B" }}>{fmt(l.net)} F</td>
                  <td className="text-right px-4 py-2 font-semibold" style={{ color: l.soldeFin >= 0 ? "#3F6B4A" : "#B04A3B" }}>{fmt(l.soldeFin)} F</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="text-xs mt-3" style={{ color: C.doux }}>
        Entrées : objectif de ventes du mois s'il existe, sinon moyenne des 3 derniers mois de ventes. Sorties : échéances fournisseurs non réglées (les retards sont comptés dans le mois en cours),
        obligations administratives ouvertes avec un montant, et dépenses courantes (moyenne des 3 derniers mois). C'est une estimation : elle ne tient pas compte des ventes à crédit encaissées plus tard.
      </p>
    </div>
  );
}
