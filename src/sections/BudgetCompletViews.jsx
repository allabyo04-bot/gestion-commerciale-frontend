import { useState, useEffect, useCallback } from "react";
import { api } from "../api.js";
import { BOUTIQUES, fmt } from "../constants.js";
import { selectStyle } from "../components/Shared.jsx";

// Lot 4 : budget par poste et par boutique, ventes prévisionnelles, état prévisionnel / réalisé.
const C = { carte: "#FFFFFF", bordure: "#EAE1D2", texte: "#2B2320", doux: "#6B5D52", accent: "#8C3B2E" };
const MOIS = ["Janvier", "Février", "Mars", "Avril", "Mai", "Juin", "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre"];
const STATUTS = {
  MAITRISE: { couleur: "#3F6B4A", fond: "#E9F0EA", label: "Maîtrisé" },
  PROCHE: { couleur: "#A8823D", fond: "#FDF3E3", label: "Proche limite" },
  DEPASSEMENT: { couleur: "#B04A3B", fond: "#FBEAE7", label: "Dépassement" },
  SANS_BUDGET: { couleur: "#B04A3B", fond: "#FBEAE7", label: "Sans budget" },
  AUCUN: { couleur: "#6B5D52", fond: "#F1E9DC", label: "—" },
};
const pastille = (s) => {
  const st = STATUTS[s] || STATUTS.AUCUN;
  return <span className="text-xs px-2.5 py-1 rounded-full font-medium whitespace-nowrap" style={{ background: st.fond, color: st.couleur }}>{st.label}</span>;
};
const pc = (v) => (v == null ? "—" : `${String(v).replace(".", ",")} %`);
const pill = (actif) => (actif ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" });
const cadre = { background: C.carte, border: `1px solid ${C.bordure}` };

export default function BudgetComplet({ onError }) {
  const [vue, setVue] = useState("synthese");
  const [annee, setAnnee] = useState(new Date().getFullYear());
  return (
    <div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        {[["synthese", "Synthèse prévu / réalisé"], ["postes", "Budget par poste"], ["objectifs", "Ventes prévisionnelles"]].map(([id, label]) => (
          <button key={id} onClick={() => setVue(id)} className="px-3 py-1.5 rounded-full text-xs font-medium" style={pill(vue === id)}>{label}</button>
        ))}
        <span className="text-sm ml-3" style={{ color: C.doux }}>Année :</span>
        <select value={annee} onChange={(e) => setAnnee(Number(e.target.value))} style={selectStyle}>
          {[annee - 1, annee, annee + 1].map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>
      {vue === "synthese" && <Synthese annee={annee} onError={onError} />}
      {vue === "postes" && <BudgetParPoste annee={annee} onError={onError} />}
      {vue === "objectifs" && <Objectifs annee={annee} onError={onError} />}
    </div>
  );
}

function Synthese({ annee, onError }) {
  const [mois, setMois] = useState("");
  const [boutique, setBoutique] = useState("");
  const [etat, setEtat] = useState(null);
  useEffect(() => {
    let vivant = true;
    setEtat(null);
    api.budgetComplet.etat({ annee, ...(mois ? { mois } : {}), ...(boutique ? { boutique } : {}) })
      .then((e) => vivant && setEtat(e)).catch((e) => onError(e.message));
    return () => { vivant = false; };
  }, [annee, mois, boutique, onError]);

  const libellePeriode = !etat ? "" : mois ? `${MOIS[mois - 1]} ${annee}` : `Cumul ${annee} jusqu'à ${MOIS[etat.jusquAuMois - 1].toLowerCase()}`;

  return (
    <div>
      <div className="flex items-center gap-2 mb-5 flex-wrap">
        <select value={mois} onChange={(e) => setMois(e.target.value)} style={selectStyle}>
          <option value="">Cumul de l'année</option>
          {MOIS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
        </select>
        {[["", "Consolidé"], ...[...BOUTIQUES, "Générale"].map((b) => [b, b])].map(([v, l]) => (
          <button key={l} onClick={() => setBoutique(v)} className="px-3 py-1.5 rounded-full text-xs font-medium" style={pill(boutique === v)}>{l}</button>
        ))}
      </div>
      {!etat && <p className="text-sm" style={{ color: C.doux }}>Chargement…</p>}
      {etat && (
        <>
          <p className="text-xs font-mono uppercase tracking-wide mb-3" style={{ color: C.accent }}>{libellePeriode}</p>

          {/* H8 — balance prévu / réalisé */}
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            <Carte titre="Recettes (ventes)" ligne1={`${fmt(etat.recettes.realiseCumul)} F réalisés`} ligne2={`Objectif année : ${fmt(etat.recettes.objectifAnnuel)} F`} avancement={etat.balance.avancementRecettes} />
            <Carte titre="Dépenses" ligne1={`${fmt(etat.depenses.realiseCumul)} F réalisés`} ligne2={`Budget année : ${fmt(etat.depenses.budgetAnnuel)} F`} avancement={etat.depenses.pourcentage} inverse />
            <div className="rounded-2xl p-4" style={cadre}>
              <p className="text-xs font-mono uppercase tracking-wide mb-1" style={{ color: C.doux }}>Résultat net</p>
              <p className="font-display text-xl font-semibold" style={{ color: etat.balance.resultatRealise >= 0 ? "#3F6B4A" : "#B04A3B" }}>{fmt(etat.balance.resultatRealise)} F</p>
              <p className="text-xs mt-1" style={{ color: C.doux }}>Réalisé à ce jour. Prévu sur l'année : {fmt(etat.balance.resultatPrevu)} F</p>
            </div>
          </div>

          {etat.alertes.length > 0 && (
            <div className="rounded-2xl p-4 mb-5" style={{ background: "#FDF3E3", border: "1px solid #E8D3A8" }}>
              <p className="text-sm font-semibold mb-2" style={{ color: "#8A5A12" }}>À surveiller</p>
              <ul className="text-sm space-y-1">
                {etat.alertes.map((a) => (
                  <li key={a.poste}>
                    <strong>{a.poste}</strong> — {a.statut === "SANS_BUDGET" ? `${fmt(a.realise)} F dépensés sans budget prévu` : `${fmt(a.realise)} F sur ${fmt(a.budget)} F (${pc(a.pourcentage)})`}
                    {" "}{pastille(a.statut)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* H3, H4 — par poste, avec le poids de chaque catégorie */}
          <p className="text-xs font-mono uppercase tracking-wide mb-2" style={{ color: C.accent }}>Dépenses par poste</p>
          <div className="rounded-2xl overflow-x-auto mb-6" style={cadre}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#F1E9DC", color: C.doux }}>
                  <th className="text-left px-4 py-2">Poste</th>
                  <th className="text-right px-4 py-2">Budget</th>
                  <th className="text-right px-4 py-2">Réalisé</th>
                  {mois && <th className="text-right px-4 py-2">Dont {MOIS[mois - 1].toLowerCase()}</th>}
                  <th className="text-right px-4 py-2">Restant</th>
                  <th className="text-right px-4 py-2">% réalisé</th>
                  <th className="text-right px-4 py-2">Poids</th>
                  <th className="text-center px-4 py-2">Statut</th>
                </tr>
              </thead>
              <tbody>
                {etat.depenses.categories.map((c) => (
                  <LigneCategorie key={c.id} c={c} mois={mois} />
                ))}
                {etat.depenses.categories.length === 0 && (
                  <tr><td colSpan={8} className="px-4 py-6 text-center" style={{ color: C.doux }}>Aucun budget ni dépense pour cette sélection. Saisis les budgets dans « Budget par poste ».</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* H5 — charges, produits et ratios par période */}
          <p className="text-xs font-mono uppercase tracking-wide mb-2" style={{ color: C.accent }}>Charges, produits et ratios par mois</p>
          <div className="rounded-2xl overflow-x-auto" style={cadre}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: "#F1E9DC", color: C.doux }}>
                  <th className="text-left px-4 py-2">Mois</th>
                  <th className="text-right px-4 py-2">Objectif ventes</th>
                  <th className="text-right px-4 py-2">Produits</th>
                  <th className="text-right px-4 py-2">% objectif</th>
                  <th className="text-right px-4 py-2">Charges</th>
                  <th className="text-right px-4 py-2">Charges / produits</th>
                  <th className="text-right px-4 py-2">Résultat</th>
                </tr>
              </thead>
              <tbody>
                {etat.serie.map((l) => (
                  <tr key={l.mois} style={{ borderTop: "1px solid #EFE7D9", background: mois && Number(mois) === l.mois ? "#FBF3EC" : undefined }}>
                    <td className="px-4 py-2">{l.nom}</td>
                    <td className="text-right px-4 py-2">{l.objectif ? `${fmt(l.objectif)} F` : "—"}</td>
                    <td className="text-right px-4 py-2">{fmt(l.produits)} F</td>
                    <td className="text-right px-4 py-2">{pc(l.avancement)}</td>
                    <td className="text-right px-4 py-2">{fmt(l.charges)} F</td>
                    <td className="text-right px-4 py-2">{pc(l.ratioCharges)}</td>
                    <td className="text-right px-4 py-2" style={{ color: l.resultat >= 0 ? "#3F6B4A" : "#B04A3B" }}>{fmt(l.resultat)} F</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: "2px solid #2B2320", fontWeight: 600 }}>
                  <td className="px-4 py-2">{mois ? MOIS[mois - 1] : "Cumul"}</td>
                  <td className="text-right px-4 py-2">{fmt(etat.periode.objectif)} F</td>
                  <td className="text-right px-4 py-2">{fmt(etat.periode.produits)} F</td>
                  <td className="text-right px-4 py-2">{pc(etat.periode.avancement)}</td>
                  <td className="text-right px-4 py-2">{fmt(etat.periode.charges)} F</td>
                  <td className="text-right px-4 py-2">{pc(etat.periode.ratioCharges)}</td>
                  <td className="text-right px-4 py-2" style={{ color: etat.periode.resultat >= 0 ? "#3F6B4A" : "#B04A3B" }}>{fmt(etat.periode.resultat)} F</td>
                </tr>
              </tfoot>
            </table>
          </div>
          <p className="text-xs mt-3" style={{ color: C.doux }}>
            Produits = ventes validées (hors ventes annulées). Charges = dépenses saisies, y compris la boutique « Générale » en vue consolidée.
            Le budget est annuel : le « % réalisé » compare les dépenses cumulées depuis janvier au budget de l'année.
          </p>
        </>
      )}
    </div>
  );
}

function LigneCategorie({ c, mois }) {
  const [ouvert, setOuvert] = useState(false);
  const aDesSous = c.sousCategories.length > 0;
  return (
    <>
      <tr style={{ borderTop: "1px solid #EFE7D9", cursor: aDesSous ? "pointer" : "default" }} onClick={() => aDesSous && setOuvert(!ouvert)}>
        <td className="px-4 py-2 font-medium">{aDesSous ? (ouvert ? "▾ " : "▸ ") : ""}{c.nom}</td>
        <td className="text-right px-4 py-2">{fmt(c.budget)} F</td>
        <td className="text-right px-4 py-2">{fmt(c.realise)} F</td>
        {mois && <td className="text-right px-4 py-2">{fmt(c.realiseMois || 0)} F</td>}
        <td className="text-right px-4 py-2" style={{ color: c.restant >= 0 ? "#3F6B4A" : "#B04A3B" }}>{fmt(c.restant)} F</td>
        <td className="text-right px-4 py-2">{pc(c.pourcentage)}</td>
        <td className="text-right px-4 py-2">
          <span className="inline-flex items-center gap-2 justify-end">
            <span className="inline-block h-1.5 rounded-full" style={{ width: Math.max(2, Math.round((c.poids || 0) * 0.6)), background: C.accent }} />
            {pc(c.poids)}
          </span>
        </td>
        <td className="px-4 py-2 text-center">{pastille(c.statut)}</td>
      </tr>
      {ouvert && c.sousCategories.map((s) => (
        <tr key={s.id || "sans"} style={{ borderTop: "1px solid #F5EFE4", background: "#FBF8F2", color: C.doux }}>
          <td className="px-4 py-1.5 pl-8">{s.nom}</td>
          <td className="text-right px-4 py-1.5">{fmt(s.budget)} F</td>
          <td className="text-right px-4 py-1.5">{fmt(s.realise)} F</td>
          {mois && <td />}
          <td className="text-right px-4 py-1.5">{fmt(s.restant)} F</td>
          <td className="text-right px-4 py-1.5">{pc(s.pourcentage)}</td>
          <td />
          <td className="px-4 py-1.5 text-center">{pastille(s.statut)}</td>
        </tr>
      ))}
    </>
  );
}

function Carte({ titre, ligne1, ligne2, avancement, inverse }) {
  const couleur = inverse && avancement >= 100 ? "#B04A3B" : "#3F6B4A";
  return (
    <div className="rounded-2xl p-4" style={cadre}>
      <p className="text-xs font-mono uppercase tracking-wide mb-1" style={{ color: C.doux }}>{titre}</p>
      <p className="font-display text-xl font-semibold">{ligne1}</p>
      <p className="text-xs mt-1 mb-2" style={{ color: C.doux }}>{ligne2}</p>
      <div className="h-2 rounded-full" style={{ background: "#F1E9DC" }}>
        <div className="h-2 rounded-full" style={{ width: `${Math.min(100, avancement || 0)}%`, background: couleur }} />
      </div>
      <p className="text-xs mt-1" style={{ color: couleur }}>{avancement == null ? "Pas encore de budget / objectif" : `${pc(avancement)} de l'année`}</p>
    </div>
  );
}

// Champ montant qui s'enregistre quand on quitte la case (ou sur Entrée).
function ChampMontant({ valeur, onSave, onError }) {
  const [txt, setTxt] = useState(valeur ? String(valeur) : "");
  useEffect(() => { setTxt(valeur ? String(valeur) : ""); }, [valeur]);
  const [ok, setOk] = useState(false);
  const valider = async () => {
    const n = Number(txt || 0);
    if (n === (valeur || 0)) return;
    try { await onSave(n); setOk(true); setTimeout(() => setOk(false), 1200); } catch (e) { onError(e.message); }
  };
  return (
    <span className="inline-flex items-center gap-1">
      <input value={txt} inputMode="numeric" onChange={(e) => setTxt(e.target.value.replace(/\D/g, ""))} onBlur={valider}
        onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()} className="w-32 text-right px-2 py-1 rounded" style={{ border: "1px solid #DDD3C4" }} />
      <span className="text-xs w-3" style={{ color: "#3F6B4A" }}>{ok ? "✓" : ""}</span>
    </span>
  );
}

function BudgetParPoste({ annee, onError }) {
  const [boutique, setBoutique] = useState("Angré");
  const [categories, setCategories] = useState([]);
  const [sousCats, setSousCats] = useState([]);
  const [postes, setPostes] = useState([]);

  const charger = useCallback(async () => {
    try {
      const [cats, scs, ps] = await Promise.all([api.depenses.categories.list(), api.budgetComplet.sousCategories.list(), api.budgetComplet.postes.list(annee)]);
      setCategories(cats.filter((c) => c.actif)); setSousCats(scs.filter((s) => s.actif)); setPostes(ps);
    } catch (e) { onError(e.message); }
  }, [annee, onError]);
  useEffect(() => { charger(); }, [charger]);

  const montant = (categorieId, sousCategorieId = "") =>
    postes.find((p) => p.boutique === boutique && p.categorieId === categorieId && p.sousCategorieId === sousCategorieId)?.montant || 0;
  const enregistrer = (categorieId, sousCategorieId = "") => async (n) => {
    await api.budgetComplet.postes.set({ annee, boutique, categorieId, sousCategorieId, montant: n });
    await charger();
  };
  const total = postes.filter((p) => p.boutique === boutique).reduce((s, p) => s + p.montant, 0);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4 flex-wrap">
        <span className="text-sm" style={{ color: C.doux }}>Boutique :</span>
        {[...BOUTIQUES, "Générale"].map((b) => <button key={b} onClick={() => setBoutique(b)} className="px-3 py-1.5 rounded-full text-xs font-medium" style={pill(boutique === b)}>{b}</button>)}
      </div>
      <p className="text-xs mb-3" style={{ color: C.doux }}>
        Saisis le budget annuel de chaque poste. Si une catégorie est découpée en sous-catégories, saisis les montants sur les sous-catégories (le total de la catégorie s'additionne tout seul).
        « Générale » regroupe les dépenses qui ne concernent pas une boutique en particulier. Les montants s'enregistrent en quittant la case.
      </p>
      <div className="rounded-2xl overflow-x-auto" style={cadre}>
        <table className="w-full text-sm">
          <thead><tr style={{ background: "#F1E9DC", color: C.doux }}><th className="text-left px-4 py-2">Poste</th><th className="text-right px-4 py-2">Budget {annee} (F CFA)</th></tr></thead>
          <tbody>
            {categories.map((c) => {
              const subs = sousCats.filter((s) => s.categorieId === c.id);
              const sommeSubs = subs.reduce((s, x) => s + montant(c.id, x.id), 0);
              return [
                <tr key={c.id} style={{ borderTop: "1px solid #EFE7D9" }}>
                  <td className="px-4 py-2 font-medium">{c.nom}</td>
                  <td className="text-right px-4 py-2">
                    <ChampMontant valeur={montant(c.id)} onSave={enregistrer(c.id)} onError={onError} />
                    {subs.length > 0 && <span className="text-xs ml-2" style={{ color: C.doux }}>+ {fmt(sommeSubs)} F en sous-catégories</span>}
                  </td>
                </tr>,
                ...subs.map((s) => (
                  <tr key={s.id} style={{ borderTop: "1px solid #F5EFE4", background: "#FBF8F2" }}>
                    <td className="px-4 py-1.5 pl-8" style={{ color: C.doux }}>{s.nom}</td>
                    <td className="text-right px-4 py-1.5"><ChampMontant valeur={montant(c.id, s.id)} onSave={enregistrer(c.id, s.id)} onError={onError} /></td>
                  </tr>
                )),
              ];
            })}
          </tbody>
          <tfoot><tr style={{ borderTop: "2px solid #2B2320", fontWeight: 600 }}><td className="px-4 py-2">Total {boutique}</td><td className="text-right px-4 py-2">{fmt(total)} F</td></tr></tfoot>
        </table>
      </div>
    </div>
  );
}

function Objectifs({ annee, onError }) {
  const [objectifs, setObjectifs] = useState([]);
  const charger = useCallback(async () => {
    try { setObjectifs(await api.budgetComplet.objectifs.list(annee)); } catch (e) { onError(e.message); }
  }, [annee, onError]);
  useEffect(() => { charger(); }, [charger]);
  const val = (mois, boutique) => objectifs.find((o) => o.mois === mois && o.boutique === boutique)?.montant || 0;
  const total = (boutique) => objectifs.filter((o) => o.boutique === boutique).reduce((s, o) => s + o.montant, 0);

  return (
    <div>
      <p className="text-xs mb-3" style={{ color: C.doux }}>
        Chiffre d'affaires visé, mois par mois et par boutique. Il sert de « ventes prévisionnelles » dans la synthèse, et les caissières voient uniquement le pourcentage atteint pour leur boutique (jamais les montants).
      </p>
      <div className="rounded-2xl overflow-x-auto" style={cadre}>
        <table className="w-full text-sm">
          <thead>
            <tr style={{ background: "#F1E9DC", color: C.doux }}>
              <th className="text-left px-4 py-2">Mois</th>
              {BOUTIQUES.map((b) => <th key={b} className="text-right px-4 py-2">{b}</th>)}
            </tr>
          </thead>
          <tbody>
            {MOIS.map((nom, i) => (
              <tr key={nom} style={{ borderTop: "1px solid #EFE7D9" }}>
                <td className="px-4 py-2">{nom}</td>
                {BOUTIQUES.map((b) => (
                  <td key={b} className="text-right px-4 py-1.5">
                    <ChampMontant valeur={val(i + 1, b)} onError={onError}
                      onSave={async (n) => { await api.budgetComplet.objectifs.set({ annee, mois: i + 1, boutique: b, montant: n }); await charger(); }} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr style={{ borderTop: "2px solid #2B2320", fontWeight: 600 }}>
              <td className="px-4 py-2">Total {annee}</td>
              {BOUTIQUES.map((b) => <td key={b} className="text-right px-4 py-2">{fmt(total(b))} F</td>)}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
