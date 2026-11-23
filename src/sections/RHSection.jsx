import { useState, useEffect, useCallback } from "react";
import { Plus, X, Printer } from "lucide-react";
import { api } from "../api.js";
import { fmt } from "../constants.js";
import { ErrorBanner, inputStyle, selectStyle, Field } from "../components/Shared.jsx";

// Lot 9 : ressources humaines et paie, réservées à l'administratrice. Les salaires et les dossiers disciplinaires sont confidentiels.
const carte = { background: "#FFFFFF", border: "1px solid #EAE1D2" };
const dateFr = (d) => (d ? new Date(d).toLocaleDateString("fr-FR") : "");
const TYPES_DEMANDE = { PERMISSION: "Permission", CONGE: "Congé", PRET: "Prêt" };
const STATUTS = { EN_ATTENTE: "En attente", ACCEPTEE: "Acceptée", REFUSEE: "Refusée" };
const EVENEMENTS = { HEURES_SUP: "Heures supplémentaires", FELICITATIONS: "Félicitations", DEMANDE_EXPLICATION: "Demande d'explication", BLAME: "Blâme", AUTRE: "Autre" };
const MOIS_NOMS = ["janvier", "février", "mars", "avril", "mai", "juin", "juillet", "août", "septembre", "octobre", "novembre", "décembre"];
const moisCourant = () => new Date().toISOString().slice(0, 7);
const moisLisible = (m) => `${MOIS_NOMS[Number(m.slice(5, 7)) - 1]} ${m.slice(0, 4)}`;
const Bouton = ({ children, plein, ...p }) => <button type="button" {...p} className="px-3 py-1.5 rounded-lg text-xs font-medium" style={plein ? { background: "#2B2320", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#2B2320" }}>{children}</button>;

function Modale({ titre, onFermer, children, large }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(43,35,32,0.45)" }}>
      <div className={`rounded-2xl p-5 w-full ${large ? "max-w-3xl" : "max-w-xl"} max-h-[92vh] overflow-y-auto`} style={{ background: "#FFFDF9" }}>
        <div className="flex items-center justify-between mb-3"><h3 className="font-display text-xl font-semibold">{titre}</h3><button type="button" onClick={onFermer}><X size={18} /></button></div>
        {children}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Demandes
function Demandes({ onError, onChange }) {
  const [liste, setListe] = useState([]);
  const [filtre, setFiltre] = useState("EN_ATTENTE");
  const charger = useCallback(async () => { try { setListe(await api.rh.demandes(filtre === "TOUTES" ? "" : filtre)); } catch (e) { onError(e.message); } }, [filtre, onError]);
  useEffect(() => { charger(); }, [charger]);
  const decider = async (d, statut) => {
    const note = window.prompt(statut === "ACCEPTEE" ? "Une remarque pour l'employée (facultatif) :" : "Pourquoi cette demande est-elle refusée ? (facultatif)", "");
    if (note === null) return;
    const corps = { statut, note };
    if (statut === "ACCEPTEE" && d.type === "PRET") {
      const nb = window.prompt(`Prêt de ${fmt(d.montant)} : en combien de mensualités sera-t-il remboursé ?`, "3");
      if (!nb) return;
      corps.nbMensualites = Number(nb);
    }
    try { await api.rh.decider(d.id, corps); await charger(); onChange(); } catch (e) { onError(e.message); }
  };
  return (
    <div>
      <div className="flex gap-2 mb-3">{["EN_ATTENTE", "TOUTES"].map((k) => <button key={k} type="button" onClick={() => setFiltre(k)} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={filtre === k ? { background: "#2B2320", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>{k === "EN_ATTENTE" ? "À traiter" : "Toutes"}</button>)}</div>
      {liste.length === 0 && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucune demande.</p>}
      {liste.map((d) => (
        <div key={d.id} className="rounded-xl p-4 mb-2" style={carte}>
          <div className="flex flex-wrap justify-between gap-2">
            <div>
              <p className="text-sm font-medium">{d.employe.prenom} {d.employe.nom} — {TYPES_DEMANDE[d.type]}{d.type === "PRET" ? ` de ${fmt(d.montant)}` : ` du ${dateFr(d.dateDebut)} au ${dateFr(d.dateFin)}`}</p>
              <p className="text-xs" style={{ color: "#6B5D52" }}>Demandée le {dateFr(d.createdAt)}{d.motif ? ` · ${d.motif}` : ""}{d.decision ? ` · Réponse : ${d.decision}` : ""}</p>
            </div>
            {d.statut === "EN_ATTENTE" ? (
              <div className="flex gap-2"><Bouton plein onClick={() => decider(d, "ACCEPTEE")}>Accepter</Bouton><Bouton onClick={() => decider(d, "REFUSEE")}>Refuser</Bouton></div>
            ) : <span className="text-xs font-medium" style={{ color: d.statut === "ACCEPTEE" ? "#3F6B4A" : "#B04A3B" }}>{STATUTS[d.statut]}</span>}
          </div>
        </div>
      ))}
    </div>
  );
}

// ---------------------------------------------------------------- Équipe
const VIDE_EMP = { nom: "", prenom: "", poste: "", boutique: "", telephone: "", dateNaissance: "", dateEmbauche: "", matriculeCnps: "", situation: "CELIBATAIRE", nbEnfants: 0, partsFiscales: "", salaireBase: 0, primeTransport: 0, primeLogement: 0, autresPrimes: 0, userId: "", actif: true, notes: "" };
function FormEmploye({ initial, utilisateurs, onSauve, onFermer }) {
  const iso = (d) => (d ? new Date(d).toISOString().slice(0, 10) : "");
  const [f, setF] = useState(initial ? { ...VIDE_EMP, ...Object.fromEntries(Object.entries(initial).map(([k, v]) => [k, v ?? ""])), dateNaissance: iso(initial.dateNaissance), dateEmbauche: iso(initial.dateEmbauche) } : VIDE_EMP);
  const [erreur, setErreur] = useState("");
  const maj = (c) => (e) => setF({ ...f, [c]: e.target.value });
  const enregistrer = async () => {
    try { initial ? await api.rh.modifierEmploye(initial.id, f) : await api.rh.creerEmploye(f); onSauve(); } catch (e) { setErreur(e.message); }
  };
  const champ = (c, label, type = "text") => <Field label={label}><input type={type} value={f[c]} onChange={maj(c)} style={inputStyle} /></Field>;
  return (
    <Modale titre={initial ? "Modifier la fiche" : "Nouvelle employée"} onFermer={onFermer} large>
      <ErrorBanner error={erreur} onClose={() => setErreur("")} />
      <div className="grid grid-cols-2 gap-x-3">
        {champ("prenom", "Prénom")}{champ("nom", "Nom")}{champ("poste", "Poste")}
        <Field label="Boutique"><select value={f.boutique} onChange={maj("boutique")} style={inputStyle}><option value="">—</option><option>Angré</option><option>Koumassi</option></select></Field>
        {champ("telephone", "Téléphone")}{champ("matriculeCnps", "N° CNPS")}{champ("dateNaissance", "Date de naissance", "date")}{champ("dateEmbauche", "Date d'embauche", "date")}
        <Field label="Situation de famille"><select value={f.situation} onChange={maj("situation")} style={inputStyle}><option value="CELIBATAIRE">Célibataire</option><option value="MARIE">Mariée</option><option value="VEUF">Veuve / veuf</option><option value="DIVORCE">Divorcée</option></select></Field>
        {champ("nbEnfants", "Nombre d'enfants à charge", "number")}
        {champ("salaireBase", "Salaire de base (F CFA / mois)", "number")}{champ("primeTransport", "Prime de transport", "number")}{champ("primeLogement", "Prime de logement", "number")}{champ("autresPrimes", "Autres primes imposables", "number")}
        {champ("partsFiscales", "Parts fiscales (laisser vide pour le calcul automatique)", "number")}
        <Field label="Compte dans le logiciel (pour ses demandes)"><select value={f.userId} onChange={maj("userId")} style={inputStyle}><option value="">Aucun</option>{utilisateurs.map((u) => <option key={u.id} value={u.id}>{u.prenom} {u.nom} ({u.boutique})</option>)}</select></Field>
      </div>
      <Field label="Notes"><textarea rows={2} value={f.notes} onChange={maj("notes")} style={inputStyle} /></Field>
      {initial && <label className="flex items-center gap-2 text-sm mt-3"><input type="checkbox" checked={!!f.actif} onChange={(e) => setF({ ...f, actif: e.target.checked })} /> Employée en poste</label>}
      <div className="flex justify-end gap-2 mt-4"><Bouton onClick={onFermer}>Annuler</Bouton><Bouton plein onClick={enregistrer}>Enregistrer</Bouton></div>
    </Modale>
  );
}
function Equipe({ onError }) {
  const [emps, setEmps] = useState([]); const [users, setUsers] = useState([]); const [anniv, setAnniv] = useState([]); const [forme, setForme] = useState(null);
  const charger = useCallback(async () => { try { const [e, u, a] = await Promise.all([api.rh.employes(), api.rh.utilisateurs(), api.rh.anniversaires()]); setEmps(e); setUsers(u); setAnniv(a); } catch (e) { onError(e.message); } }, [onError]);
  useEffect(() => { charger(); }, [charger]);
  return (
    <div>
      {anniv.length > 0 && <div className="rounded-xl p-3 mb-3 text-sm" style={{ background: "#FFF6E5", border: "1px solid #F0DDB0" }}>🎂 {anniv.map((a) => `${a.prenom} ${a.nom} (${a.jours === 0 ? "aujourd'hui" : `dans ${a.jours} j`}, ${a.age} ans)`).join(" · ")}</div>}
      <div className="mb-3"><Bouton plein onClick={() => setForme("nouvelle")}><Plus size={13} className="inline" /> Nouvelle employée</Bouton></div>
      {emps.length === 0 && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucune employée enregistrée.</p>}
      {emps.map((e) => (
        <div key={e.id} className="rounded-xl p-4 mb-2 flex flex-wrap justify-between gap-2" style={{ ...carte, opacity: e.actif ? 1 : 0.55 }}>
          <div><p className="text-sm font-medium">{e.prenom} {e.nom}{e.actif ? "" : " (partie)"}</p><p className="text-xs" style={{ color: "#6B5D52" }}>{[e.poste, e.boutique, e.telephone, e.dateEmbauche ? `embauchée le ${dateFr(e.dateEmbauche)}` : null, e.userId ? "compte lié" : null].filter(Boolean).join(" · ")}</p></div>
          <div className="flex items-center gap-3"><span className="text-sm font-medium">{fmt(e.salaireBase)}</span><Bouton onClick={() => setForme(e)}>Modifier</Bouton></div>
        </div>
      ))}
      {forme && <FormEmploye initial={forme === "nouvelle" ? null : forme} utilisateurs={users} onFermer={() => setForme(null)} onSauve={() => { setForme(null); charger(); }} />}
    </div>
  );
}

// ---------------------------------------------------------------- Suivi du personnel
function Suivi({ onError }) {
  const [emps, setEmps] = useState([]); const [evts, setEvts] = useState([]); const [pts, setPts] = useState(null); const [reunions, setReunions] = useState([]);
  const [ev, setEv] = useState({ employeId: "", type: "HEURES_SUP", date: new Date().toISOString().slice(0, 10), heures: "", tauxMajoration: 15, details: "" });
  const [pt, setPt] = useState({ employeId: "", jour: new Date().toISOString().slice(0, 10), arrivee: "" });
  const [re, setRe] = useState({ titre: "", compteRendu: "", date: new Date().toISOString().slice(0, 10) });
  const charger = useCallback(async () => { try { const [e, v, p, r] = await Promise.all([api.rh.employes(), api.rh.evenements(), api.rh.pointages(moisCourant()), api.rh.reunions()]); setEmps(e.filter((x) => x.actif)); setEvts(v); setPts(p); setReunions(r); } catch (e) { onError(e.message); } }, [onError]);
  useEffect(() => { charger(); }, [charger]);
  const agir = async (f) => { try { await f(); await charger(); } catch (e) { onError(e.message); } };
  const choix = (v, set, k) => <select value={v[k]} onChange={(e) => set({ ...v, [k]: e.target.value })} style={selectStyle}><option value="">Employée…</option>{emps.map((x) => <option key={x.id} value={x.id}>{x.prenom} {x.nom}</option>)}</select>;
  return (
    <div className="grid md:grid-cols-2 gap-4">
      <div className="rounded-xl p-4" style={carte}>
        <h4 className="font-medium mb-2">Événements (heures supplémentaires, félicitations, explications, blâmes)</h4>
        <div className="flex flex-wrap gap-2 mb-2">
          {choix(ev, setEv, "employeId")}
          <select value={ev.type} onChange={(e) => setEv({ ...ev, type: e.target.value })} style={selectStyle}>{Object.entries(EVENEMENTS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <input type="date" value={ev.date} onChange={(e) => setEv({ ...ev, date: e.target.value })} style={selectStyle} />
          {ev.type === "HEURES_SUP" && <><input type="number" step="0.5" placeholder="Heures" value={ev.heures} onChange={(e) => setEv({ ...ev, heures: e.target.value })} style={{ ...selectStyle, width: 80 }} /><select value={ev.tauxMajoration} onChange={(e) => setEv({ ...ev, tauxMajoration: e.target.value })} style={selectStyle}>{[15, 50, 75, 100].map((t) => <option key={t} value={t}>+{t} %</option>)}</select></>}
        </div>
        <textarea rows={2} placeholder="Détails" value={ev.details} onChange={(e) => setEv({ ...ev, details: e.target.value })} style={inputStyle} />
        <div className="mt-2"><Bouton plein onClick={() => agir(async () => { await api.rh.creerEvenement(ev); setEv({ ...ev, heures: "", details: "" }); })}>Enregistrer</Bouton></div>
        <div className="mt-3 max-h-80 overflow-y-auto">{evts.map((v) => <div key={v.id} className="text-sm py-1.5 flex justify-between gap-2" style={{ borderTop: "1px solid #EAE1D2" }}><span>{dateFr(v.date)} · {v.employe.prenom} {v.employe.nom} · <b>{EVENEMENTS[v.type]}</b>{v.heures ? ` ${v.heures} h (+${v.tauxMajoration} %)` : ""}{v.details ? ` — ${v.details}` : ""}</span><button type="button" onClick={() => window.confirm("Supprimer cette ligne ?") && agir(() => api.rh.supprimerEvenement(v.id))}><X size={13} /></button></div>)}</div>
      </div>
      <div className="rounded-xl p-4" style={carte}>
        <h4 className="font-medium mb-2">Heures d'arrivée</h4>
        <p className="text-xs mb-2" style={{ color: "#6B5D52" }}>Ouverture : {pts?.heureOuverture} (réglable dans Paie &gt; Paramètres). Une arrivée plus tardive est marquée en retard.</p>
        <div className="flex flex-wrap gap-2 mb-2">{choix(pt, setPt, "employeId")}<input type="date" value={pt.jour} onChange={(e) => setPt({ ...pt, jour: e.target.value })} style={selectStyle} /><input type="time" value={pt.arrivee} onChange={(e) => setPt({ ...pt, arrivee: e.target.value })} style={selectStyle} /><Bouton plein onClick={() => agir(() => api.rh.pointer(pt))}>Noter</Bouton></div>
        <div className="max-h-72 overflow-y-auto">{pts?.lignes.map((l) => <div key={l.id} className="text-sm py-1.5 flex justify-between" style={{ borderTop: "1px solid #EAE1D2", color: l.retard ? "#B04A3B" : undefined }}><span>{l.jour.split("-").reverse().join("/")} · {l.employe.prenom} {l.employe.nom} · {l.arrivee}{l.retard ? " (retard)" : ""}</span><button type="button" onClick={() => agir(() => api.rh.supprimerPointage(l.id))}><X size={13} /></button></div>)}</div>
      </div>
      <div className="rounded-xl p-4 md:col-span-2" style={carte}>
        <h4 className="font-medium mb-2">Comptes rendus de réunion</h4>
        <div className="flex flex-wrap gap-2 mb-2"><input placeholder="Titre" value={re.titre} onChange={(e) => setRe({ ...re, titre: e.target.value })} style={{ ...selectStyle, flex: 1 }} /><input type="date" value={re.date} onChange={(e) => setRe({ ...re, date: e.target.value })} style={selectStyle} /></div>
        <textarea rows={3} placeholder="Compte rendu" value={re.compteRendu} onChange={(e) => setRe({ ...re, compteRendu: e.target.value })} style={inputStyle} />
        <div className="mt-2"><Bouton plein onClick={() => agir(async () => { await api.rh.creerReunion(re); setRe({ ...re, titre: "", compteRendu: "" }); })}>Enregistrer</Bouton></div>
        {reunions.map((r) => <div key={r.id} className="py-2 mt-2" style={{ borderTop: "1px solid #EAE1D2" }}><div className="flex justify-between"><b className="text-sm">{dateFr(r.date)} — {r.titre}</b><button type="button" onClick={() => window.confirm("Supprimer ce compte rendu ?") && agir(() => api.rh.supprimerReunion(r.id))}><X size={13} /></button></div><p className="text-sm whitespace-pre-wrap" style={{ color: "#6B5D52" }}>{r.compteRendu}</p></div>)}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- Paie
function imprimerBulletin(b) {
  const d = b.donnees, L = d.lignes, e = d.employe;
  const f = (n) => Number(n || 0).toLocaleString("fr-FR");
  const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
  const ligne = (lib, gain, ret) => `<tr><td>${lib}</td><td class="n">${gain ? f(gain) : ""}</td><td class="n">${ret ? f(ret) : ""}</td></tr>`;
  const w = window.open("", "_blank");
  if (!w) { window.alert("Le navigateur a bloqué la fenêtre : autorise les fenêtres pour ce site."); return; }
  w.document.write(`<html><head><title>Bulletin ${esc(e.prenom)} ${esc(e.nom)} ${b.mois}</title><style>body{font-family:Arial,sans-serif;font-size:13px;margin:40px;color:#000}h1{font-size:18px}table{width:100%;border-collapse:collapse;margin-top:14px}td,th{border:1px solid #999;padding:5px 8px;text-align:left}th{background:#eee}.n{text-align:right}.t td{font-weight:bold;background:#f5f5f5}small{color:#555}</style></head><body>
  <h1>La Pointure Espagnole — Bulletin de paie</h1><p>Période : <b>${esc(moisLisible(b.mois))}</b></p>
  <p>Employée : <b>${esc(e.prenom)} ${esc(e.nom)}</b> · ${esc(e.poste || "")}<br>N° CNPS : ${esc(e.matriculeCnps || "—")} · Parts fiscales : ${L.parts}</p>
  <table><tr><th>Désignation</th><th class="n">Gains</th><th class="n">Retenues</th></tr>
  ${ligne("Salaire de base", L.salaireBase)}${ligne("Prime de transport", L.primeTransport)}${ligne("Prime de logement", L.primeLogement)}${ligne("Autres primes", L.autresPrimes)}${ligne(`Heures supplémentaires (${d.nbHeuresSup} h)`, L.heuresSup)}
  <tr class="t"><td>Salaire brut</td><td class="n">${f(b.brut)}</td><td></td></tr>
  ${ligne("CNPS retraite (part salariale)", 0, L.cnpsSalarie)}${ligne(`Impôt sur salaires (ITS)${L.reductionFamille ? ` après réduction famille ${f(L.reductionFamille)}` : ""}`, 0, L.its || "0")}${L.cmuSalarie ? ligne("CMU", 0, L.cmuSalarie) : ""}${L.retenuePret ? ligne("Remboursement de prêt", 0, L.retenuePret) : ""}
  <tr class="t"><td>NET À PAYER</td><td class="n">${f(b.net)}</td><td></td></tr></table>
  <p><small>Part patronale (information) : retraite ${f(L.patronal.retraite)} · prestations familiales ${f(L.patronal.prestationsFamiliales)} · maternité ${f(L.patronal.maternite)} · accident du travail ${f(L.patronal.accidentTravail)} — coût total employeur ${f(b.coutEmployeur)} F CFA.<br>Document de gestion interne, à faire confirmer par la CNPS ou un comptable avant tout usage officiel.</small></p></body></html>`);
  w.document.close(); w.focus(); w.print();
}

function Parametres({ onError }) {
  const [p, setP] = useState(null); const [ok, setOk] = useState("");
  useEffect(() => { api.paie.parametres().then((r) => setP(r.parametres)).catch((e) => onError(e.message)); }, [onError]);
  if (!p) return null;
  const num = (v) => (v === "" ? 0 : Number(v));
  const champ = (groupe, cle, label) => <Field key={cle} label={label}><input type="number" step="0.01" value={groupe ? p[groupe][cle] : p[cle]} onChange={(e) => setP(groupe ? { ...p, [groupe]: { ...p[groupe], [cle]: num(e.target.value) } } : { ...p, [cle]: num(e.target.value) })} style={inputStyle} /></Field>;
  const tranche = (i, k, v) => setP({ ...p, its: { ...p.its, tranches: p.its.tranches.map((t, j) => (j === i ? (k === 0 ? [v === "" ? null : Number(v), t[1]] : [t[0], Number(v)]) : t)) } });
  const enregistrer = async () => { try { setOk(""); const r = await api.paie.enregistrerParametres(p); setP(r.parametres); setOk("Paramètres enregistrés."); } catch (e) { onError(e.message); } };
  return (
    <div>
      <div className="rounded-xl p-3 mb-3 text-sm" style={{ background: "#FFF6E5", border: "1px solid #F0DDB0" }}>⚠ Ces taux et ce barème sont les valeurs trouvées pour la Côte d'Ivoire. <b>Fais-les confirmer par la CNPS, la DGI ou un comptable avant le premier vrai bulletin</b>, puis corrige-les ici si besoin.</div>
      <div className="grid md:grid-cols-3 gap-x-4">
        {champ("cnps", "retraiteSalarie", "CNPS retraite salariée (%)")}{champ("cnps", "retraiteEmployeur", "CNPS retraite employeur (%)")}{champ("cnps", "plafondRetraite", "Plafond retraite (F / mois)")}
        {champ("cnps", "prestationsFamiliales", "Prestations familiales employeur (%)")}{champ("cnps", "maternite", "Maternité employeur (%)")}{champ("cnps", "accidentTravail", "Accident du travail employeur (%, 2 à 5)")}
        {champ("cnps", "plafondAutres", "Plafond des autres branches (F / mois)")}{champ("cmu", "salarie", "CMU salariée (F / mois)")}{champ("cmu", "employeur", "CMU employeur (F / mois)")}
        {champ("its", "reductionParDemiPart", "Réduction ITS par demi-part (F / mois)")}{champ(null, "heuresParMois", "Heures de travail par mois")}
        <Field label="Heure d'ouverture (retards)"><input type="time" value={p.heureOuverture} onChange={(e) => setP({ ...p, heureOuverture: e.target.value })} style={inputStyle} /></Field>
      </div>
      <h4 className="font-medium mt-4 mb-1">Barème de l'impôt sur salaires (mensuel, sur le brut)</h4>
      {p.its.tranches.map((t, i) => <div key={i} className="flex items-center gap-2 mb-1 text-sm">jusqu'à <input type="number" value={t[0] ?? ""} placeholder="sans limite" onChange={(e) => tranche(i, 0, e.target.value)} style={{ ...selectStyle, width: 140 }} /> F : taux <input type="number" step="0.1" value={t[1]} onChange={(e) => tranche(i, 1, e.target.value)} style={{ ...selectStyle, width: 80 }} /> %</div>)}
      <div className="mt-4 flex items-center gap-3"><Bouton plein onClick={enregistrer}>Enregistrer les paramètres</Bouton>{ok && <span className="text-sm" style={{ color: "#3F6B4A" }}>{ok}</span>}</div>
    </div>
  );
}

function Paie({ onError }) {
  const [mois, setMois] = useState(moisCourant()); const [liste, setListe] = useState([]); const [vue, setVue] = useState("BULLETINS"); const [info, setInfo] = useState(""); const [prets, setPrets] = useState([]);
  const charger = useCallback(async () => { try { setListe(await api.paie.bulletins(mois)); setPrets(await api.rh.prets()); } catch (e) { onError(e.message); } }, [mois, onError]);
  useEffect(() => { charger(); }, [charger]);
  const agir = async (f) => { try { await f(); await charger(); } catch (e) { onError(e.message); } };
  const totaux = liste.reduce((t, b) => ({ brut: t.brut + b.brut, net: t.net + b.net, cout: t.cout + b.coutEmployeur }), { brut: 0, net: 0, cout: 0 });
  return (
    <div>
      <div className="flex gap-2 mb-3">{[["BULLETINS", "Bulletins"], ["PRETS", "Prêts"], ["PARAMETRES", "Paramètres"]].map(([k, t]) => <button key={k} type="button" onClick={() => setVue(k)} className="px-3 py-1.5 rounded-lg text-sm font-medium" style={vue === k ? { background: "#2B2320", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>{t}</button>)}</div>
      {vue === "PARAMETRES" && <Parametres onError={onError} />}
      {vue === "PRETS" && (prets.length === 0 ? <p className="text-sm" style={{ color: "#6B5D52" }}>Aucun prêt accordé. Un prêt accepté dans « Demandes » apparaît ici et se rembourse chaque mois sur le bulletin.</p> : prets.map((p) => <div key={p.id} className="rounded-xl p-3 mb-2 text-sm flex justify-between" style={carte}><span>{p.employe.prenom} {p.employe.nom} — prêt de {fmt(p.montant)}, {fmt(p.mensualite)} par mois</span><b style={{ color: p.reste > 0 ? "#B04A3B" : "#3F6B4A" }}>{p.reste > 0 ? `reste ${fmt(p.reste)}` : "soldé"}</b></div>))}
      {vue === "BULLETINS" && (
        <>
          <div className="flex flex-wrap items-center gap-2 mb-3"><input type="month" value={mois} onChange={(e) => { setMois(e.target.value); setInfo(""); }} style={selectStyle} /><Bouton plein onClick={() => agir(async () => { const r = await api.paie.calculer(mois); setInfo(`${r.calcules} bulletin(s) calculé(s)${r.ignores ? `, ${r.ignores} déjà validé(s) conservé(s)` : ""}${r.sansSalaire ? ` · ${r.sansSalaire} employée(s) sans salaire renseigné` : ""}.`); })}>Calculer {moisLisible(mois)}</Bouton></div>
          {info && <p className="text-sm mb-2" style={{ color: "#6B5D52" }}>{info}</p>}
          {liste.length === 0 && <p className="text-sm" style={{ color: "#6B5D52" }}>Aucun bulletin pour ce mois : clique sur « Calculer ».</p>}
          {liste.map((b) => (
            <div key={b.id} className="rounded-xl p-3 mb-2 flex flex-wrap items-center justify-between gap-2" style={carte}>
              <div className="text-sm"><b>{b.employe.prenom} {b.employe.nom}</b> · brut {fmt(b.brut)} · <b>net {fmt(b.net)}</b>{b.retenuePret ? ` (dont prêt ${fmt(b.retenuePret)})` : ""}<span className="ml-2 text-xs" style={{ color: b.statut === "VALIDE" ? "#3F6B4A" : "#B07A2B" }}>{b.statut === "VALIDE" ? "Validé" : "Brouillon"}</span></div>
              <div className="flex gap-2">
                <Bouton onClick={() => agir(async () => imprimerBulletin(await api.paie.bulletin(b.id)))}><Printer size={12} className="inline" /> Bulletin</Bouton>
                {b.statut === "BROUILLON" ? <><Bouton plein onClick={() => window.confirm("Valider ce bulletin ? Les prêts remboursés ce mois-ci seront diminués.") && agir(() => api.paie.valider(b.id))}>Valider</Bouton><Bouton onClick={() => window.confirm("Supprimer ce brouillon ?") && agir(() => api.paie.supprimer(b.id))}>Supprimer</Bouton></> : <Bouton onClick={() => window.confirm("Rouvrir ce bulletin validé ?") && agir(() => api.paie.rouvrir(b.id))}>Rouvrir</Bouton>}
              </div>
            </div>
          ))}
          {liste.length > 0 && <p className="text-sm mt-3" style={{ color: "#6B5D52" }}>Total du mois : brut {fmt(totaux.brut)} · net à payer {fmt(totaux.net)} · coût employeur {fmt(totaux.cout)}</p>}
        </>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- Écran
export default function RHSection({ onChange }) {
  const [vue, setVue] = useState("DEMANDES"); const [erreur, setErreur] = useState("");
  const onError = useCallback((m) => setErreur(m), []);
  const onglets = [["DEMANDES", "Demandes"], ["EQUIPE", "Équipe"], ["SUIVI", "Suivi du personnel"], ["PAIE", "Paie"]];
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">Ressources humaines</h1>
      <p className="text-sm mb-4" style={{ color: "#6B5D52" }}>Réservé à l'administratrice : équipe, demandes, suivi du personnel et paie.</p>
      <ErrorBanner error={erreur} onClose={() => setErreur("")} />
      <div className="flex gap-2 flex-wrap mb-4">{onglets.map(([k, t]) => <button key={k} type="button" onClick={() => setVue(k)} className="px-4 py-2 rounded-full text-sm font-medium" style={vue === k ? { background: "#2B2320", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>{t}</button>)}</div>
      {vue === "DEMANDES" && <Demandes onError={onError} onChange={onChange} />}
      {vue === "EQUIPE" && <Equipe onError={onError} />}
      {vue === "SUIVI" && <Suivi onError={onError} />}
      {vue === "PAIE" && <Paie onError={onError} />}
    </div>
  );
}
