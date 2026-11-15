import { useState, useEffect, useRef } from "react";
import { Plus, Check } from "lucide-react";
import { api } from "../api.js";
import { POINTURES } from "../constants.js";
import { selectStyle } from "./Shared.jsx";

// Nom sans accents ni majuscules : "to" retrouve "Togo", "cote" retrouve "Côte d'Ivoire".
export function cleNom(s) {
  return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Propositions qui commencent par la saisie d'abord, puis celles qui la contiennent.
export function filtrerPropositions(options, saisie, max = 8) {
  const k = cleNom(saisie);
  if (!k) return options.slice(0, max);
  const debut = options.filter((o) => cleNom(o).startsWith(k));                                              // « to » → Togo
  const mot = options.filter((o) => !debut.includes(o) && cleNom(o).split(" ").some((m) => m.startsWith(k))); // début d'un autre mot
  const reste = options.filter((o) => !debut.includes(o) && !mot.includes(o) && cleNom(o).includes(k));
  return [...debut, ...mot, ...reste].slice(0, max);
}

const champ = { ...selectStyle, width: "100%" };

/**
 * Champ de saisie avec propositions. `strict` : seule une valeur de la liste est acceptée (le texte est vidé
 * à la sortie du champ si rien ne correspond) ; sinon la saisie libre reste possible.
 */
export function ChampPropositions({ value, onChange, options, placeholder, strict = false, disabled = false, inputRef, id }) {
  const [ouvert, setOuvert] = useState(false);
  const [actif, setActif] = useState(0);
  const propositions = filtrerPropositions(options, value);
  const exacte = options.find((o) => cleNom(o) === cleNom(value));

  const choisir = (o) => { onChange(o); setOuvert(false); };
  const surSortie = () => {
    // petit délai : laisse le clic sur une proposition se faire avant de fermer
    setTimeout(() => {
      setOuvert(false);
      if (exacte && exacte !== value) onChange(exacte);
      else if (strict && value && !exacte) onChange("");
    }, 150);
  };
  return (
    <div className="relative">
      <input
        id={id} ref={inputRef} value={value} disabled={disabled} autoComplete="off" placeholder={placeholder} style={champ}
        onChange={(e) => { onChange(e.target.value); setOuvert(true); setActif(0); }}
        onFocus={() => setOuvert(true)}
        onBlur={surSortie}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") { e.preventDefault(); setOuvert(true); setActif((a) => Math.min(a + 1, propositions.length - 1)); }
          else if (e.key === "ArrowUp") { e.preventDefault(); setActif((a) => Math.max(a - 1, 0)); }
          else if (e.key === "Enter" && ouvert && propositions[actif] && value.trim()) { e.preventDefault(); choisir(propositions[actif]); }
          else if (e.key === "Escape") setOuvert(false);
        }}
      />
      {ouvert && value.trim() && propositions.length > 0 && !(propositions.length === 1 && propositions[0] === value) && (
        <div className="absolute z-20 w-full mt-1 rounded-lg overflow-hidden" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2", maxHeight: "220px", overflowY: "auto" }}>
          {propositions.map((o, i) => (
            <button key={o} type="button" onMouseDown={(e) => { e.preventDefault(); choisir(o); }} className="w-full text-left px-3 py-2 text-sm"
              style={{ borderTop: i ? "1px solid #EFE7D9" : "none", background: i === actif ? "#F1E9DC" : "#FFFFFF" }}>
              {o}
            </button>
          ))}
        </div>
      )}
      {strict && value.trim() && !exacte && (
        <p className="text-xs mt-1" style={{ color: "#B04A3B" }}>Choisis une proposition de la liste.</p>
      )}
    </div>
  );
}

/**
 * Cliente repérée par son téléphone. Le curseur arrive sur le numéro ; dès qu'il est complet, on dit si la fiche
 * existe (et on montre son nom) ou on propose de la créer dans la même fenêtre. La fiche n'est créée qu'à
 * l'enregistrement de la vente ou de la livraison — jamais pendant la saisie.
 *  - `pointureObligatoire` : exigée pour une nouvelle cliente (livraison), facultative en caisse.
 *  - `onResolution({ valide, trouve, client })` : le formulaire sait où en est la recherche.
 */
export function ClienteParTelephone({ telephone, onTelephone, nom, onNom, pointure, onPointure, pointureObligatoire = false, autoFocus = false, onResolution, titre = "Téléphone" }) {
  const [res, setRes] = useState(null);
  const [cherche, setCherche] = useState(false);
  const refTel = useRef(null);
  const avaitFiche = useRef(false); // la recherche précédente avait trouvé une fiche
  useEffect(() => { if (autoFocus && refTel.current) refTel.current.focus(); }, [autoFocus]);

  const chiffres = String(telephone || "").replace(/\D/g, "");
  useEffect(() => {
    if (chiffres.length < 8) { setRes(null); setCherche(false); onResolution?.(null); return undefined; }
    let annule = false;
    setCherche(true);
    const t = setTimeout(() => {
      api.referentiels.clientParTelephone(telephone)
        .then((r) => {
          if (annule) return;
          const fiche = r && r.valide && r.trouve ? r.client : null;
          // Fiche connue : sa pointure s'affiche. On passe d'une fiche connue à autre chose : on repart d'une pointure vide.
          if (fiche) onPointure(fiche.pointure || ""); else if (avaitFiche.current) onPointure("");
          avaitFiche.current = !!fiche;
          setRes(r); setCherche(false); onResolution?.(r);
        })
        .catch(() => { if (annule) return; setRes(null); setCherche(false); onResolution?.(null); });
    }, 350);
    return () => { annule = true; clearTimeout(t); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [telephone]);

  const trouvee = res?.valide && res.trouve ? res.client : null;
  const nouvelle = res?.valide && !res.trouve && !res.boutiqueGenerique;

  return (
    <div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>{titre}</label>
          <input ref={refTel} value={telephone} onChange={(e) => onTelephone(e.target.value)} style={champ} inputMode="tel" placeholder="Ex : 0708735901" autoComplete="off" />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Nom {trouvee ? "" : "(optionnel)"}</label>
          {trouvee ? (
            <div style={{ ...champ, background: "#E9F0EA", color: "#3F6B4A", display: "flex", alignItems: "center", gap: "6px" }}><Check size={14} /> {trouvee.nomPrenoms}</div>
          ) : (
            <input value={nom} onChange={(e) => onNom(e.target.value)} style={champ} placeholder="Si connu" />
          )}
        </div>
      </div>
      {cherche && <p className="text-xs mt-1" style={{ color: "#6B5D52" }}>Recherche de la fiche…</p>}
      {res?.boutiqueGenerique && (
        <p className="text-xs mt-2 px-3 py-2 rounded-lg" style={{ background: "#FBF3E3", color: "#A8823D" }}>Ce numéro est celui d'une boutique, pas d'une cliente : aucune fiche ne sera créée avec.</p>
      )}
      {(trouvee || nouvelle) && (
        <div className="mt-3 rounded-lg p-3" style={{ background: trouvee ? "#F4F8F4" : "#FBF3E3", border: `1px solid ${trouvee ? "#CFE0D2" : "#EBD9A8"}` }}>
          {trouvee ? (
            <p className="text-xs mb-2" style={{ color: "#3F6B4A" }}>✓ Cliente déjà enregistrée : sa fiche sera utilisée.</p>
          ) : (
            <p className="text-xs mb-2" style={{ color: "#8A6A22" }}>
              <Plus size={12} style={{ display: "inline", marginRight: "4px" }} />
              Nouvelle cliente : sa fiche sera créée à l'enregistrement{nom.trim() ? "" : " (nom vide : elle s'appellera « CLIENTE 000n »)"}.
            </p>
          )}
          <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>
            Pointure {pointureObligatoire && nouvelle ? <span style={{ color: "#B04A3B" }}>(obligatoire)</span> : <span>(facultative)</span>}
          </label>
          <select value={pointure} onChange={(e) => onPointure(e.target.value)} style={{ ...champ, maxWidth: "180px" }}>
            <option value="">— Choisir —</option>
            {POINTURES.map((p) => <option key={p} value={p}>T{p}</option>)}
          </select>
        </div>
      )}
    </div>
  );
}

/** Choix du livreur dans la liste, avec création directe d'un nouveau livreur (sans passer par l'administratrice). */
export function ChoixLivreur({ livreurId, onChange, onError }) {
  const [livreurs, setLivreurs] = useState([]);
  const [ajout, setAjout] = useState(false);
  const [nouveau, setNouveau] = useState("");
  const [envoi, setEnvoi] = useState(false);
  const charger = () => api.referentiels.livreurs().then(setLivreurs).catch(() => {});
  useEffect(() => { charger(); }, []);

  const creer = async () => {
    if (nouveau.trim().length < 2) { onError?.("Écris le nom du livreur (2 lettres au moins)."); return; }
    setEnvoi(true);
    try {
      const l = await api.referentiels.creerLivreur(nouveau.trim());
      await charger();
      onChange(l.id);
      setAjout(false); setNouveau("");
    } catch (e) { onError?.(e.message); } finally { setEnvoi(false); }
  };

  return (
    <div>
      <div className="flex gap-2">
        <select value={livreurId} onChange={(e) => onChange(e.target.value)} style={champ}>
          <option value="">— Choisir le livreur —</option>
          {livreurs.filter((l) => l.actif || l.id === livreurId).map((l) => <option key={l.id} value={l.id}>{l.nom}</option>)}
        </select>
        <button type="button" onClick={() => setAjout((v) => !v)} className="px-3 rounded-lg text-xs font-medium whitespace-nowrap" style={{ border: "1px solid #DDD3C4", color: "#8C3B2E" }}>
          + Nouveau
        </button>
      </div>
      {ajout && (
        <div className="flex gap-2 mt-2">
          <input value={nouveau} onChange={(e) => setNouveau(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); creer(); } }} style={champ} placeholder="Nom du nouveau livreur" autoFocus />
          <button type="button" onClick={creer} disabled={envoi} className="px-3 rounded-lg text-xs font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC", opacity: envoi ? 0.6 : 1 }}>Ajouter</button>
        </div>
      )}
    </div>
  );
}

/** Commune (liste) + quartier (saisie libre avec propositions tirées des livraisons passées). */
export function LieuLivraisonChamps({ commune, onCommune, quartier, onQuartier }) {
  const [communes, setCommunes] = useState([]);
  const [quartiers, setQuartiers] = useState([]);
  useEffect(() => { api.referentiels.lieux().then((l) => setCommunes(l.communes.filter((c) => c.actif).map((c) => c.nom))).catch(() => {}); }, []);
  useEffect(() => {
    if (!commune) { setQuartiers([]); return; }
    api.referentiels.quartiers(commune).then(setQuartiers).catch(() => setQuartiers([]));
  }, [commune]);
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <div>
        <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Commune</label>
        <select value={commune} onChange={(e) => onCommune(e.target.value)} style={champ}>
          <option value="">— Choisir la commune —</option>
          {communes.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>
      <div>
        <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Quartier</label>
        <ChampPropositions value={quartier} onChange={onQuartier} options={quartiers} placeholder={commune ? "Ex : Riviera 2, Angré 8e tranche…" : "Choisis d'abord la commune"} disabled={!commune} />
      </div>
    </div>
  );
}

/** Destination d'une expédition : Côte d'Ivoire (ville libre) ou hors Côte d'Ivoire (pays de la liste). */
export function DestinationExpedition({ zone, onZone, lieu, onLieu }) {
  const [pays, setPays] = useState([]);
  const [villes, setVilles] = useState([]);
  useEffect(() => {
    api.referentiels.lieux().then((l) => setPays(l.pays.filter((p) => p.actif).map((p) => p.nom))).catch(() => {});
    api.referentiels.villesExpedition().then(setVilles).catch(() => {});
  }, []);
  const bouton = (valeur, texte) => (
    <button type="button" onClick={() => { onZone(valeur); onLieu(""); }} className="flex-1 px-3 py-2 rounded-lg text-sm font-medium"
      style={zone === valeur ? { background: "#8C3B2E", color: "#FBF3EC" } : { border: "1px solid #DDD3C4", color: "#6B5D52" }}>{texte}</button>
  );
  return (
    <div className="rounded-lg p-3 mt-3" style={{ background: "#FAF7F2", border: "1px solid #EFE7D9" }}>
      <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Destination de l'expédition</label>
      <div className="flex gap-2 mb-2">{bouton("CI", "En Côte d'Ivoire")}{bouton("HORS_CI", "Hors Côte d'Ivoire")}</div>
      {zone === "CI" && (
        <>
          <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Ville</label>
          <ChampPropositions value={lieu} onChange={onLieu} options={villes} placeholder="Ex : Bouaké, Korhogo, San-Pédro…" />
        </>
      )}
      {zone === "HORS_CI" && (
        <>
          <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Pays</label>
          <ChampPropositions value={lieu} onChange={onLieu} options={pays} placeholder="Tape les premières lettres : to → Togo" strict />
        </>
      )}
    </div>
  );
}
