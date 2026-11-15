import { useState } from "react";
import { Eye, Percent, Truck, ListChecks, ShieldCheck } from "lucide-react";
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
];

export default function AdministrationSection({ ongletInitial = "SUIVI", peutGererAcces = true }) {
  const [vue, setVue] = useState(ongletInitial);
  const onglets = ONGLETS.filter(([id]) => id !== "ACCES" || peutGererAcces);
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
      {vue === "LIVRAISONS" && (
        <SousOnglets items={[["STATS", "Statistiques lieux et livreurs"], ...(FICHES_LIVRAISON_ACTIF ? [["CONTROLE", "Contrôle des livraisons"]] : [])]}>
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
