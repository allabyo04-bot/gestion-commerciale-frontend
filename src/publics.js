import { useEffect, useState } from "react";
import { api } from "./api.js";
import { useAuth } from "./context/AuthContext.jsx";
import { POINTURES } from "./constants.js";

// Publics (Femme, Homme, Enfants) : chaque article a son échelle de pointures. Tant que l'interrupteur « publics » est éteint,
// tout le monde garde l'échelle actuelle (POINTURES) : le comportement est strictement celui d'avant.
let cache = null;
let promesse = null;
function charger() {
  if (!promesse) promesse = api.publics.echelles().then((r) => { cache = r; return r; }).catch(() => { promesse = null; return null; });
  return promesse;
}
export function rafraichirEchelles() { cache = null; promesse = null; }
const num = (a, b) => parseFloat(a) - parseFloat(b);

export function usePointures() {
  const { fonctions } = useAuth();
  const actif = !!fonctions.publics;
  const [d, setD] = useState(cache);
  useEffect(() => { if (actif && !cache) charger().then((r) => r && setD(r)); }, [actif]);
  const echelles = actif && d?.echelles ? d.echelles : null;
  // Pointures d'un article : celles de son public, plus celles déjà en stock (une échelle modifiée ne fait jamais disparaître du stock).
  const pointuresDe = (article) => {
    if (!echelles) return POINTURES;
    const base = echelles[article?.publicCible || "FEMME"] || POINTURES;
    const extra = (article?.stocks || []).map((s) => s.pointure).filter((p) => p && !base.includes(p));
    return extra.length ? [...new Set([...base, ...extra])].sort(num) : base;
  };
  // Toutes les pointures possibles (fiche cliente, échange…).
  const toutes = echelles ? [...new Set([...POINTURES, ...Object.values(echelles).flat()])].sort(num) : POINTURES;
  return { actif, pointuresDe, toutes, publics: d?.publics || [], echelles };
}
export const LIBELLE_PUBLIC = { FEMME: "Femme", HOMME: "Homme", ENFANT: "Enfants" };
