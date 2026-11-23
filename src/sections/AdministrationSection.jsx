import { useState } from "react";
import { useAuth } from "../context/AuthContext.jsx";
import { api } from "../api.js";
import { Eye, Percent, Truck, ListChecks, ShieldCheck, ToggleLeft } from "lucide-react";
import { FICHES_LIVRAISON_ACTIF } from "../constants.js";
import { JournalGeneral, FichesClients, RemisesParCaissiere, ControleLivraisons } from "./JournalAuditSection.jsx";
import { Statistiques, Gestion } from "./LieuxLivreursView.jsx";
import UtilisateursSection from "./UtilisateursSection.jsx";
import RolesSection from "./RolesSection.jsx";

function Pastilles({ items, valeur, onChange, petit }) {
  return (
    <div className={`flex gap-2 flex-wrap ${petit ? "mb-4" : "mb-5"}`}>
      {items.map(([id, label, Icon]) => (
        <button key={id} type="button" onClick={() => onChange(id)}
          className={`${petit ? "px-3 py-1.5" : "px-4 py-2"} rounded-full text-sm font-medium flex items-center gap-1.5`}
          style={valeur === id ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>
          {Icon && <Icon size={14} />} {label}
        </button>
      ))}
    </div>
  );
}

function SousOnglets({ items, children }) {
  const [v, setV] = useState(items[0][0]);
  return (
    <div>
      <Pastilles petit items={items} valeur={v} onChange={setV} />
      {children(v)}
    </div>
  );
}

const ONGLETS = [
  ["SUIVI", "Suivi", Eye],
  ["REMISES", "Remises", Percent],
  ["LIVRAISONS", "Livraisons", Truck],
  ["LISTES", "Listes", ListChecks],
  ["ACCES", "Utilisateurs et rôles", ShieldCheck],
  ["INTERRUPTEURS", "Interrupteurs", ToggleLeft],
];

const LOTS = [["lot1", "Lot 1 — Caisse et livraisons"], ["lot2", "Lot 2 — Clientes et fidélité"], ["lot3", "Lot 3 — Analyses de ventes et de stock"], ["lot4", "Lot 4 — Dépenses, budget et objectifs"], ["lot5", "Lot 5 — Fiche article enrichie"], ["lot6", "Lot 6 — Obligations administratives"], ["lot7", "Lot 7 — Fournisseurs, achats et trésorerie"], ["lot9", "Lot 9 — Ressources humaines et paie"], ["lot10", "Lot 10 — Remise de fin de journée des livreurs"], ["publics", "Publics — Femme, Homme et Enfants (pointures par public)"], ["rappels", "Rappels par e-mail des échéances (lots 6 et 7)"]];

// Réservé au développeur : allume ou éteint les nouveautés de chaque lot, sans toucher au code.
function Interrupteurs() {
  const { fonctions, setFonctions } = useAuth();
  const [erreur, setErreur] = useState("");
  const basculer = async (code) => {
    try { setErreur(""); setFonctions(await api.fonctions.regler(code, !fonctions[code])); } catch (e) { setErreur(e.message); }
  };
  return (
    <div className="max-w-xl">
      <p className="text-sm mb-4" style={{ color: "#6B5D52" }}>Une nouveauté éteinte reste invisible pour tout le monde. Allume-la quand le lot est validé et l'acompte reçu.</p>
      {erreur && <p className="text-sm mb-3" style={{ color: "#B04A3B" }}>{erreur}</p>}
      {LOTS.map(([code, titre]) => (
        <div key={code} className="flex items-center justify-between rounded-xl p-4 mb-2" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
          <div><p className="text-sm font-medium">{titre}</p><p className="text-xs" style={{ color: "#6B5D52" }}>{fonctions[code] ? "Allumé : visible par tous" : "Éteint : invisible"}</p></div>
          <button type="button" onClick={() => basculer(code)} className="px-4 py-2 rounded-full text-sm font-medium"
            style={fonctions[code] ? { background: "#3F6B4A", color: "#F3F7F3" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>{fonctions[code] ? "Allumé" : "Éteint"}</button>
        </div>
      ))}
      <RappelsEmail />
    </div>
  );
}

// Aperçu et envoi immédiat du rappel d'échéances (le rappel automatique du matin dépend de l'interrupteur « rappels »).
function RappelsEmail() {
  const [apercu, setApercu] = useState(null);
  const [message, setMessage] = useState("");
  const [occupe, setOccupe] = useState(false);
  const voir = async () => {
    try { setMessage(""); setOccupe(true); setApercu(await api.rappels.apercu()); } catch (e) { setMessage(e.message); } finally { setOccupe(false); }
  };
  const envoyer = async () => {
    try {
      setOccupe(true);
      const r = await api.rappels.envoyer();
      setMessage(r.envoye ? `E-mail envoyé à ${r.destinataire} (${r.total} échéance${r.total > 1 ? "s" : ""}).` : r.raison);
    } catch (e) { setMessage(e.message); } finally { setOccupe(false); }
  };
  return (
    <div className="rounded-xl p-4 mt-4" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
      <p className="text-sm font-medium mb-1">Rappels par e-mail</p>
      <p className="text-xs mb-3" style={{ color: "#6B5D52" }}>Quand l'interrupteur est allumé, un e-mail part chaque matin s'il y a une échéance en retard ou proche. Ces deux boutons te permettent de voir et d'essayer sans attendre.</p>
      <div className="flex gap-2 mb-2">
        <button type="button" disabled={occupe} onClick={voir} className="px-4 py-2 rounded-full text-sm font-medium" style={{ border: "1px solid #DDD3C4", color: "#6B5D52" }}>Voir ce qui partirait</button>
        <button type="button" disabled={occupe} onClick={envoyer} className="px-4 py-2 rounded-full text-sm font-medium" style={{ background: "#2B2320", color: "#FBF3EC" }}>Envoyer maintenant</button>
      </div>
      {message && <p className="text-sm mb-2" style={{ color: "#6B5D52" }}>{message}</p>}
      {apercu && (
        <div className="text-xs" style={{ color: "#6B5D52" }}>
          <p className="mb-1">Destinataire : {apercu.destinataire || "non configuré"}{apercu.configure ? "" : " — envoi non configuré sur le serveur"}</p>
          <pre className="whitespace-pre-wrap" style={{ fontFamily: "inherit" }}>{apercu.total ? `${apercu.sujet}\n\n${apercu.texte}` : "Rien à signaler pour le moment (ou les lots 6 et 7 sont éteints)."}</pre>
        </div>
      )}
    </div>
  );
}

export default function AdministrationSection({ ongletInitial = "SUIVI", peutGererAcces = true }) {
  const { user, fonctions } = useAuth();
  const lot1 = !!fonctions.lot1;
  const developpeur = ["phil"].includes(String(user?.login || "").toLowerCase()) || String(user?.prenom || "").toLowerCase() === "phil";
  const [vue, setVue] = useState(ongletInitial);
  const onglets = ONGLETS.filter(([id]) => (id !== "ACCES" || peutGererAcces) && (id !== "INTERRUPTEURS" || developpeur));
  // Lot 1 (B5) : les statistiques lieux et livreurs passent dans le menu États
  const itemsLivraisons = [...(lot1 ? [] : [["STATS", "Statistiques lieux et livreurs"]]), ...(FICHES_LIVRAISON_ACTIF ? [["CONTROLE", "Contrôle des livraisons"]] : [])];
  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">Administration</h1>
      <p className="text-sm mb-5" style={{ color: "#6B5D52" }}>
        Réservé à l'administrateur — suivi, contrôles, listes et accès.
      </p>
      <Pastilles items={onglets} valeur={vue} onChange={setVue} />
      {vue === "SUIVI" && (
        <SousOnglets items={[["JOURNAL", "Journal général"], ["CLIENTS", "Fiches clients"]]}>
          {(v) => (v === "JOURNAL" ? <JournalGeneral /> : <FichesClients />)}
        </SousOnglets>
      )}
      {vue === "REMISES" && <RemisesParCaissiere />}
      {vue === "INTERRUPTEURS" && developpeur && <Interrupteurs />}
      {vue === "LIVRAISONS" && itemsLivraisons.length > 0 && (
        <SousOnglets items={itemsLivraisons}>
          {(v) => (v === "STATS" ? <Statistiques /> : <ControleLivraisons />)}
        </SousOnglets>
      )}
      {vue === "LISTES" && <Gestion />}
      {vue === "ACCES" && (
        <SousOnglets items={[["USERS", "Utilisateurs"], ["ROLES", "Rôles"]]}>
          {(v) => (v === "USERS" ? <UtilisateursSection /> : <RolesSection />)}
        </SousOnglets>
      )}
    </div>
  );
}
