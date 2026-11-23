import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { fmt } from "../constants.js";
import { ErrorBanner, inputStyle, Field } from "../components/Shared.jsx";

// Lot 9 : l'employée fait elle-même ses demandes de permission, de congé et de prêt, et suit leur réponse.
const TYPES = { PERMISSION: "Permission", CONGE: "Congé", PRET: "Prêt" };
const STATUTS = { EN_ATTENTE: ["En attente", "#B07A2B"], ACCEPTEE: ["Acceptée", "#3F6B4A"], REFUSEE: ["Refusée", "#B04A3B"] };
const dateFr = (d) => new Date(d).toLocaleDateString("fr-FR");

export default function MesDemandesSection() {
  const [etat, setEtat] = useState(null); const [erreur, setErreur] = useState(""); const [envoi, setEnvoi] = useState(false);
  const [f, setF] = useState({ type: "PERMISSION", dateDebut: "", dateFin: "", montant: "", motif: "" });
  const charger = useCallback(async () => { try { setEtat(await api.rh.mesDemandes()); } catch (e) { setErreur(e.message); } }, []);
  useEffect(() => { charger(); }, [charger]);
  const maj = (c) => (e) => setF({ ...f, [c]: e.target.value });
  const envoyer = async () => {
    try { setEnvoi(true); await api.rh.creerMaDemande(f); setF({ type: "PERMISSION", dateDebut: "", dateFin: "", montant: "", motif: "" }); await charger(); } catch (e) { setErreur(e.message); } finally { setEnvoi(false); }
  };
  return (
    <div className="max-w-2xl">
      <h1 className="font-display text-2xl font-semibold mb-1">Mes demandes</h1>
      <p className="text-sm mb-4" style={{ color: "#6B5D52" }}>Permission, congé ou prêt : ta demande arrive chez l'administratrice, qui te répond ici.</p>
      <ErrorBanner error={erreur} onClose={() => setErreur("")} />
      {etat && !etat.lie && <p className="text-sm" style={{ color: "#6B5D52" }}>Ton compte n'est pas encore relié à une fiche d'employée. Demande à l'administratrice de le faire.</p>}
      {etat?.lie && (
        <>
          <div className="rounded-xl p-4 mb-4" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
            <Field label="Type de demande"><select value={f.type} onChange={maj("type")} style={inputStyle}>{Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Field>
            {f.type === "PRET" ? <Field label="Montant demandé (F CFA)"><input type="number" value={f.montant} onChange={maj("montant")} style={inputStyle} /></Field> : (
              <div className="grid grid-cols-2 gap-3"><Field label="Du"><input type="date" value={f.dateDebut} onChange={maj("dateDebut")} style={inputStyle} /></Field><Field label="Au"><input type="date" value={f.dateFin} onChange={maj("dateFin")} style={inputStyle} /></Field></div>
            )}
            <Field label="Motif"><textarea rows={2} value={f.motif} onChange={maj("motif")} style={inputStyle} /></Field>
            <button type="button" disabled={envoi} onClick={envoyer} className="mt-3 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#2B2320", color: "#FBF3EC" }}>{envoi ? "Envoi…" : "Envoyer la demande"}</button>
          </div>
          {etat.demandes.map((d) => (
            <div key={d.id} className="rounded-xl p-3 mb-2 text-sm flex justify-between gap-2" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
              <div><b>{TYPES[d.type]}</b>{d.type === "PRET" ? ` de ${fmt(d.montant)}` : ` du ${dateFr(d.dateDebut)} au ${dateFr(d.dateFin)}`}<p className="text-xs" style={{ color: "#6B5D52" }}>{d.motif}{d.decision ? ` · Réponse : ${d.decision}` : ""}</p></div>
              <div className="text-right shrink-0"><b style={{ color: STATUTS[d.statut][1] }}>{STATUTS[d.statut][0]}</b>{d.statut === "EN_ATTENTE" && <button type="button" className="block text-xs underline mt-1" onClick={async () => { try { await api.rh.retirerMaDemande(d.id); charger(); } catch (e) { setErreur(e.message); } }}>Retirer</button>}</div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
