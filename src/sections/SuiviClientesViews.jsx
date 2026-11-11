import { useState, useEffect, useCallback } from "react";
import { MessageCircle, Check, Undo2, Download, Gift } from "lucide-react";
import { api } from "../api.js";
import { fmt, PAYS_INDICATIF } from "../constants.js";

// Suivi des clientes (à remercier / à relancer) et paires vendues par marque.
// Tout est réservé à l'administratrice et caché derrière SUIVI_CLIENTES_ACTIF (voir EtatsSection
// et DashboardSection, qui décident de l'affichage).

const C = { carte: "#FFFFFF", bordure: "#EAE1D2", texte: "#2B2320", doux: "#6B5D52", accent: "#8C3B2E", or: "#A8823D", vert: "#3F6B4A", fond: "#FAF7F2" };

// ---------- Dates ----------
function iso(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
export function periodePreset(id) {
  const auj = new Date();
  if (id === "aujourdhui") return [iso(auj), iso(auj)];
  if (id === "7j") { const d = new Date(); d.setDate(d.getDate() - 6); return [iso(d), iso(auj)]; }
  if (id === "30j") { const d = new Date(); d.setDate(d.getDate() - 29); return [iso(d), iso(auj)]; }
  if (id === "mois") return [iso(new Date(auj.getFullYear(), auj.getMonth(), 1)), iso(auj)];
  if (id === "moisPrecedent") return [iso(new Date(auj.getFullYear(), auj.getMonth() - 1, 1)), iso(new Date(auj.getFullYear(), auj.getMonth(), 0))];
  if (id === "3mois") return [iso(new Date(auj.getFullYear(), auj.getMonth() - 2, 1)), iso(auj)];
  if (id === "debut") return ["2000-01-01", iso(auj)];
  return [iso(auj), iso(auj)];
}
const LIBELLES_PERIODE = { aujourdhui: "Aujourd'hui", "7j": "7 derniers jours", "30j": "30 derniers jours", mois: "Ce mois", moisPrecedent: "Mois dernier", "3mois": "3 derniers mois", debut: "Depuis le début" };

function fmtDate(d) { return d ? new Date(d).toLocaleDateString("fr-FR") : "—"; }

// ---------- Téléphone / WhatsApp ----------
// Même règle que sur le reçu (voir ReceiptModal) : on ne devine jamais l'indicatif d'un pays inconnu.
function numeroWhatsApp(numero, pays) {
  if (!numero) return null;
  const brut = String(numero).trim();
  const chiffres = brut.replace(/\D/g, "");
  if (!chiffres) return null;
  // Déjà écrit en format international (+225… ou 00225…) : l'indicatif est fourni par le numéro lui-même
  if (brut.startsWith("+")) return chiffres;
  if (brut.startsWith("00")) return chiffres.slice(2);
  const conf = PAYS_INDICATIF[pays];
  if (!conf) return null;
  if (chiffres.startsWith(conf.code)) return chiffres;
  const local = chiffres.startsWith("0") && !conf.garderZero ? chiffres.slice(1) : chiffres;
  return conf.code + local;
}

// ---------- Petits composants communs ----------
function SelecteurPeriode({ presets, periode, onChange }) {
  return (
    <div className="mb-4">
      <div className="flex flex-wrap gap-2 mb-3">
        {presets.map((id) => (
          <button key={id} type="button" onClick={() => { const [d, f] = periodePreset(id); onChange({ preset: id, debut: d, fin: f }); }}
            className="px-3 py-1.5 rounded-full text-sm font-medium"
            style={periode.preset === id ? { background: C.texte, color: "#FBF3EC" } : { border: `1px solid ${C.bordure}`, color: C.doux }}>
            {LIBELLES_PERIODE[id]}
          </button>
        ))}
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-xs mb-1" style={{ color: C.doux }}>Du</label>
          <input type="date" value={periode.debut} onChange={(e) => onChange({ preset: "perso", debut: e.target.value, fin: periode.fin })}
            className="px-3 py-1.5 rounded-lg text-sm" style={{ border: `1px solid ${C.bordure}`, background: "#fff" }} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: C.doux }}>Au</label>
          <input type="date" value={periode.fin} onChange={(e) => onChange({ preset: "perso", debut: periode.debut, fin: e.target.value })}
            className="px-3 py-1.5 rounded-lg text-sm" style={{ border: `1px solid ${C.bordure}`, background: "#fff" }} />
        </div>
      </div>
    </div>
  );
}

function SelectBoutique({ valeur, onChange }) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: C.doux }}>Boutique</label>
      <select value={valeur} onChange={(e) => onChange(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm" style={{ border: `1px solid ${C.bordure}`, background: "#fff" }}>
        <option value="">Toutes</option>
        <option value="Angré">Angré</option>
        <option value="Koumassi">Koumassi</option>
      </select>
    </div>
  );
}

function Erreur({ message }) {
  if (!message) return null;
  return <p className="text-sm mb-4 px-4 py-3 rounded-lg" style={{ background: "#FBEAE7", color: C.accent }}>⚠ {message}</p>;
}

function Case({ label, checked, onChange }) {
  return (
    <label className="flex items-center gap-2 text-sm cursor-pointer" style={{ color: C.doux }}>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} /> {label}
    </label>
  );
}

function Note({ children }) {
  return <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: "#FBF3E3", color: "#7A5F26" }}>{children}</p>;
}

// ---------- Tri et export ----------
const TRIS_REMERCIER = [["recent", "Achat le plus récent"], ["montant", "Montant le plus élevé"], ["achats", "Plus d'achats"]];
const TRIS_RELANCE = [["ancienne", "Absence la plus ancienne"], ["montant", "Montant total le plus élevé"], ["achats", "Plus d'achats"]];

function trier(lignes, mode, cleMontant) {
  const copie = [...lignes];
  const date = (l) => new Date(l.derniereVente).getTime();
  if (mode === "montant") copie.sort((a, b) => (b[cleMontant] || 0) - (a[cleMontant] || 0) || date(b) - date(a));
  else if (mode === "achats") copie.sort((a, b) => b.nbAchats - a.nbAchats || (b[cleMontant] || 0) - (a[cleMontant] || 0));
  else if (mode === "recent") copie.sort((a, b) => date(b) - date(a));
  else if (mode === "ancienne") copie.sort((a, b) => date(a) - date(b));
  return copie;
}

function SelectTri({ valeur, options, onChange }) {
  return (
    <div>
      <label className="block text-xs mb-1" style={{ color: C.doux }}>Trier par</label>
      <select value={valeur} onChange={(e) => onChange(e.target.value)} className="px-3 py-1.5 rounded-lg text-sm" style={{ border: `1px solid ${C.bordure}`, background: "#fff" }}>
        {options.map(([id, label]) => <option key={id} value={id}>{label}</option>)}
      </select>
    </div>
  );
}

// Export CSV lisible par Excel (même format que l'export des fiches clients : séparateur ";", accents
// conservés, zéro de tête des numéros protégé). Contient des coordonnées de clientes : à manipuler avec soin.
function exporterCsv(nomFichier, entetes, lignes) {
  const protegerNumero = (n) => (n ? `="${String(n).trim()}"` : "");
  const toutes = [entetes, ...lignes.map((l) => l.map((cell) => (cell !== null && typeof cell === "object" && "__numero" in cell ? protegerNumero(cell.__numero) : cell ?? "")))];
  const csv = toutes.map((ligne) => ligne.map((cell) => {
    const texte = String(cell);
    if (/^="[^"]*"$/.test(texte)) return texte;
    return `"${texte.replace(/"/g, '""')}"`;
  }).join(";")).join("\r\n");
  const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `${nomFichier}_${iso(new Date())}.csv`; a.click();
  URL.revokeObjectURL(url);
}

function BoutonExport({ nombre, onClick }) {
  return (
    <button type="button" onClick={onClick} disabled={nombre === 0} className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg font-medium"
      style={{ border: `1px solid ${C.bordure}`, color: nombre === 0 ? C.doux : C.texte, background: "#fff", opacity: nombre === 0 ? 0.5 : 1 }}>
      <Download size={13} /> Exporter pour Excel ({nombre})
    </button>
  );
}

// Explique d'où viennent (ou pourquoi manquent) les clientes affichées : chaque étape du filtrage est chiffrée
function Explication({ children }) {
  return <p className="text-xs mb-4" style={{ color: C.doux }}>{children}</p>;
}

// Une ligne cliente : [nombre d'achats] Nom (Nouvelle) · téléphone · détail ... [WhatsApp] [Message envoyé]
// Message prérempli pour une cliente ayant un bonus : il reste vrai — le bonus se déduit à la caisse,
// pas sur une livraison, et seulement pour un achat au moins égal à son montant.
function messageBonus(montant) {
  return `Bonjour, c'est La Pointure Espagnole. Bonne nouvelle : vous avez un bonus fidélité Cendrillon de ${fmt(montant)} F à utiliser lors de votre prochain achat en boutique (pour un achat d'au moins ${fmt(montant)} F). Nous serons ravies de vous accueillir !`;
}

function LigneCliente({ ligne, type, details, onMessage }) {
  const estBonus = type === "BONUS";
  const [enCours, setEnCours] = useState(false);
  const [erreur, setErreur] = useState("");
  const lien = (() => {
    const n = numeroWhatsApp(ligne.whatsapp || ligne.telephone, ligne.pays);
    if (!n) return null;
    return estBonus ? `https://wa.me/${n}?text=${encodeURIComponent(messageBonus(ligne.bonusDisponible))}` : `https://wa.me/${n}`;
  })();
  const tel = ligne.whatsapp || ligne.telephone;

  const marquer = async () => {
    setEnCours(true); setErreur("");
    try {
      const res = await api.suiviClientes.marquerMessage(ligne.clientId, type);
      onMessage(ligne.clientId, { dejaEnvoye: true, dernierMessage: { id: res.id, createdAt: res.createdAt, par: null } });
    } catch (e) { setErreur(e.message); } finally { setEnCours(false); }
  };
  const annuler = async () => {
    setEnCours(true); setErreur("");
    try {
      await api.suiviClientes.annulerMessage(ligne.dernierMessage.id);
      onMessage(ligne.clientId, { dejaEnvoye: false, dernierMessage: null });
    } catch (e) { setErreur(e.message); } finally { setEnCours(false); }
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-xl px-4 py-3" style={{ background: C.carte, border: `1px solid ${C.bordure}`, opacity: ligne.dejaEnvoye ? 0.6 : 1 }}>
      <div className="flex items-center gap-3 min-w-0">
        {estBonus ? (
          <span className="flex items-center justify-center rounded-full shrink-0" style={{ width: 34, height: 34, background: "#E9F0EA", color: C.vert }} title="Bonus Cendrillon disponible">
            <Gift size={16} />
          </span>
        ) : (
          <span className="flex items-center justify-center rounded-full font-mono font-semibold shrink-0"
            style={{ width: 34, height: 34, background: ligne.nbAchats === 1 ? C.accent : "#F1E8DA", color: ligne.nbAchats === 1 ? "#FBF3EC" : C.texte }}
            title={`${ligne.nbAchats} achat${ligne.nbAchats > 1 ? "s" : ""} enregistré${ligne.nbAchats > 1 ? "s" : ""}`}>
            {ligne.nbAchats}
          </span>
        )}
        <div className="min-w-0">
          <p className="text-sm font-medium truncate">
            {ligne.nomPrenoms}
            {ligne.nouvelle && type === "REMERCIEMENT" && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "#FBEAE7", color: C.accent }}>Nouvelle cliente</span>}
            {estBonus && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "#E9F0EA", color: C.vert }}>Bonus {fmt(ligne.bonusDisponible)} F</span>}
            {ligne.soldeDu > 0 && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "#FBF3E3", color: "#7A5F26" }}>Solde dû : {fmt(ligne.soldeDu)} F</span>}
          </p>
          <p className="text-xs" style={{ color: C.doux }}>
            {tel || "Téléphone non renseigné"}{details ? ` · ${details}` : ""}
          </p>
          {erreur && <p className="text-xs" style={{ color: C.accent }}>{erreur}</p>}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {lien && (
          <a href={lien} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs px-2.5 py-1.5 rounded-lg" style={{ border: `1px solid ${C.bordure}`, color: C.vert }}>
            <MessageCircle size={13} /> WhatsApp
          </a>
        )}
        {ligne.dejaEnvoye ? (
          <span className="flex items-center gap-1.5 text-xs" style={{ color: C.vert }}>
            <Check size={14} /> {estBonus ? "Appelée le" : "Envoyé le"} {fmtDate(ligne.dernierMessage?.createdAt)}
            <button type="button" onClick={annuler} disabled={enCours} title="Annuler (coché par erreur)" style={{ color: C.doux }}><Undo2 size={13} /></button>
          </span>
        ) : (
          <button type="button" onClick={marquer} disabled={enCours} className="text-xs px-3 py-1.5 rounded-lg font-medium" style={{ background: C.accent, color: "#FBF3EC" }}>
            {enCours ? "..." : (estBonus ? "Appelée" : "Message envoyé")}
          </button>
        )}
      </div>
    </div>
  );
}

// Met à jour une ligne en place (sans recharger) : la ligne reste visible, grisée, pour pouvoir annuler.
function useMajLigne(setDonnees) {
  return useCallback((clientId, patch) => {
    setDonnees((d) => (d ? { ...d, lignes: d.lignes.map((l) => (l.clientId === clientId ? { ...l, ...patch } : l)) } : d));
  }, [setDonnees]);
}

// ---------- Clientes à remercier ----------
export function ClientesARemercier() {
  const [periode, setPeriode] = useState(() => { const [d, f] = periodePreset("7j"); return { preset: "7j", debut: d, fin: f }; });
  const [boutique, setBoutique] = useState("");
  const [avecTel, setAvecTel] = useState(true);
  const [masquer, setMasquer] = useState(true);
  const [tri, setTri] = useState("recent");
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");
  const maj = useMajLigne(setDonnees);

  useEffect(() => {
    if (!periode.debut || !periode.fin) return;
    let annule = false;
    setDonnees(null); setErreur("");
    api.suiviClientes.aRemercier({ dateDebut: periode.debut, dateFin: periode.fin, boutique, avecTelephone: avecTel ? "1" : "", nonEnvoyes: masquer ? "1" : "" })
      .then((r) => { if (!annule) setDonnees(r); })
      .catch((e) => { if (!annule) setErreur(e.message); });
    return () => { annule = true; };
  }, [periode.debut, periode.fin, boutique, avecTel, masquer]);

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: C.doux }}>
        Les clientes qui ont acheté sur la période et qui n'ont plus rien à payer. Le chiffre devant le nom est son nombre d'achats ; <strong>1</strong> = première fois, idéal pour un message de bienvenue.
      </p>
      <SelecteurPeriode presets={["aujourdhui", "7j", "30j", "mois", "moisPrecedent"]} periode={periode} onChange={setPeriode} />
      <div className="flex flex-wrap items-end gap-5 mb-5">
        <SelectBoutique valeur={boutique} onChange={setBoutique} />
        <Case label="Seulement celles avec un téléphone" checked={avecTel} onChange={setAvecTel} />
        <Case label="Masquer celles déjà remerciées" checked={masquer} onChange={setMasquer} />
        <SelectTri valeur={tri} options={TRIS_REMERCIER} onChange={setTri} />
      </div>
      <Erreur message={erreur} />
      {donnees === null && !erreur && <p className="text-sm" style={{ color: C.doux }}>Chargement...</p>}
      {donnees && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
            <p className="text-sm font-medium">
              {donnees.lignes.length} cliente(s) · {donnees.nbNouvelles} nouvelle(s)
              {donnees.nbAvecSolde > 0 && <span className="font-normal" style={{ color: C.doux }}> · {donnees.nbAvecSolde} non listée(s) car il leur reste un solde à payer</span>}
            </p>
            <BoutonExport nombre={donnees.lignes.length} onClick={() => exporterCsv("clientes-a-remercier",
              ["Nom et prénoms", "Téléphone", "WhatsApp", "Nombre d'achats", "Nouvelle cliente", "Dernier achat", "Boutique", "Vendeuse", "Montant sur la période (F)", "Message envoyé le"],
              trier(donnees.lignes, tri, "montantPeriode").map((l) => [l.nomPrenoms, { __numero: l.telephone }, { __numero: l.whatsapp }, l.nbAchats, l.nouvelle ? "Oui" : "Non", fmtDate(l.derniereVente), l.derniereBoutique || "", l.vendeuse || "", l.montantPeriode, l.dejaEnvoye ? fmtDate(l.dernierMessage?.createdAt) : ""]))} />
          </div>
          {donnees.diagnostic && (donnees.diagnostic.nbMasqueesTelephone > 0 || donnees.diagnostic.nbMasqueesDejaEnvoyes > 0) && (
            <Explication>
              {donnees.diagnostic.nbCandidates} cliente(s) sans solde à payer sur la période
              {donnees.diagnostic.nbMasqueesTelephone > 0 ? `, ${donnees.diagnostic.nbMasqueesTelephone} masquée(s) faute de téléphone` : ""}
              {donnees.diagnostic.nbMasqueesDejaEnvoyes > 0 ? `, ${donnees.diagnostic.nbMasqueesDejaEnvoyes} masquée(s) car déjà remerciée(s)` : ""}.
            </Explication>
          )}
          {donnees.debutHistorique && <Note>Les achats ne sont connus que depuis le {fmtDate(donnees.debutHistorique)} : une cliente qui achetait déjà avant cette date peut apparaître comme « nouvelle ».</Note>}
          {donnees.lignes.length === 0 ? (
            <p className="text-sm" style={{ color: C.doux }}>Aucune cliente à remercier avec ces critères.</p>
          ) : (
            <div className="space-y-2">
              {trier(donnees.lignes, tri, "montantPeriode").map((l) => (
                <LigneCliente key={l.clientId} ligne={l} type="REMERCIEMENT" onMessage={maj}
                  details={`dernier achat le ${fmtDate(l.derniereVente)} · ${fmt(l.montantPeriode)} F sur la période${l.vendeuse ? ` · vendeuse : ${l.vendeuse}` : ""}`} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Clientes à relancer ----------
const CLE_DELAI = "suiviClientes.delaiRelance";
function delaiInitial() {
  try { const v = parseInt(localStorage.getItem(CLE_DELAI), 10); if (v >= 1 && v <= 60) return v; } catch { /* stockage indisponible : valeur par défaut */ }
  return 3; // l'historique ne remonte qu'à mi-juillet : 6 mois donnerait une liste vide au démarrage
}

export function ClientesARelancer() {
  const [mois, setMois] = useState(delaiInitial);
  const [saisie, setSaisie] = useState(String(delaiInitial()));
  const [boutique, setBoutique] = useState("");
  const [avecTel, setAvecTel] = useState(true);
  const [masquer, setMasquer] = useState(true);
  const [tri, setTri] = useState("ancienne");
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");
  const maj = useMajLigne(setDonnees);

  // Le délai s'applique tout seul, dès que la saisie est valide (sans devoir appuyer sur Entrée)
  useEffect(() => {
    const v = parseInt(saisie, 10);
    if (!(v >= 1 && v <= 60) || v === mois) return undefined;
    const t = setTimeout(() => {
      setMois(v);
      try { localStorage.setItem(CLE_DELAI, String(v)); } catch { /* sans importance */ }
    }, 400);
    return () => clearTimeout(t);
  }, [saisie, mois]);
  // Saisie invalide ou vide laissée telle quelle : on remet le dernier délai valide en quittant la case
  const corrigerSaisie = () => { if (!(parseInt(saisie, 10) >= 1 && parseInt(saisie, 10) <= 60)) setSaisie(String(mois)); };

  useEffect(() => {
    let annule = false;
    setDonnees(null); setErreur("");
    api.suiviClientes.aRelancer({ mois: String(mois), boutique, avecTelephone: avecTel ? "1" : "", nonEnvoyes: masquer ? "1" : "" })
      .then((r) => { if (!annule) setDonnees(r); })
      .catch((e) => { if (!annule) setErreur(e.message); });
    return () => { annule = true; };
  }, [mois, boutique, avecTel, masquer]);

  const moisHistorique = donnees?.debutHistorique ? Math.floor((Date.now() - new Date(donnees.debutHistorique).getTime()) / (30.44 * 24 * 3600 * 1000)) : null;

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: C.doux }}>
        Les clientes qui n'ont rien acheté depuis le délai choisi, pour prendre de leurs nouvelles et comprendre leur absence.
      </p>
      <div className="flex flex-wrap items-end gap-5 mb-5">
        <div>
          <label className="block text-xs mb-1" style={{ color: C.doux }}>Sans achat depuis (mois)</label>
          <input type="number" min="1" max="60" value={saisie} onChange={(e) => setSaisie(e.target.value)} onBlur={corrigerSaisie}
            onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
            className="px-3 py-1.5 rounded-lg text-sm w-24" style={{ border: `1px solid ${C.bordure}`, background: "#fff" }} />
        </div>
        <SelectBoutique valeur={boutique} onChange={setBoutique} />
        <Case label="Seulement celles avec un téléphone" checked={avecTel} onChange={setAvecTel} />
        <Case label="Masquer celles déjà relancées" checked={masquer} onChange={setMasquer} />
        <SelectTri valeur={tri} options={TRIS_RELANCE} onChange={setTri} />
      </div>
      <Erreur message={erreur} />
      {donnees === null && !erreur && <p className="text-sm" style={{ color: C.doux }}>Chargement...</p>}
      {donnees && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <p className="text-sm font-medium">{donnees.lignes.length} cliente(s) à relancer</p>
            <BoutonExport nombre={donnees.lignes.length} onClick={() => exporterCsv("clientes-a-relancer",
              ["Nom et prénoms", "Téléphone", "WhatsApp", "Nombre d'achats", "Dernier achat", "Boutique", "Vendeuse", "Montant total (F)", "Message envoyé le"],
              trier(donnees.lignes, tri, "montantTotal").map((l) => [l.nomPrenoms, { __numero: l.telephone }, { __numero: l.whatsapp }, l.nbAchats, fmtDate(l.derniereVente), l.derniereBoutique || "", l.vendeuse || "", l.montantTotal, l.dejaEnvoye ? fmtDate(l.dernierMessage?.createdAt) : ""]))} />
          </div>
          {donnees.diagnostic && (
            <Explication>
              Dernier achat avant le {fmtDate(donnees.diagnostic.seuil)} (délai de {donnees.mois} mois) : {donnees.diagnostic.nbDormantes} cliente(s) trouvée(s) sur {donnees.diagnostic.nbClientesAvecAchat} ayant déjà acheté
              {donnees.diagnostic.nbMasqueesTelephone > 0 ? `, ${donnees.diagnostic.nbMasqueesTelephone} masquée(s) faute de téléphone` : ""}
              {donnees.diagnostic.nbMasqueesDejaEnvoyes > 0 ? `, ${donnees.diagnostic.nbMasqueesDejaEnvoyes} masquée(s) car déjà relancée(s)` : ""}.
            </Explication>
          )}
          {moisHistorique !== null && moisHistorique < mois && (
            <Note>Le logiciel ne connaît les achats que depuis le {fmtDate(donnees.debutHistorique)} (environ {moisHistorique} mois). Avec un délai de {mois} mois, la liste sera encore vide ou très courte : essayez un délai plus court (2 ou 3 mois) pour l'utiliser dès maintenant.</Note>
          )}
          {donnees.fichesSansAchat > 0 && (
            <p className="text-xs mb-4" style={{ color: C.doux }}>{fmt(donnees.fichesSansAchat)} fiche(s) clientes n'ont aucun achat enregistré depuis le {fmtDate(donnees.debutHistorique)} : elles ne sont pas proposées ici.</p>
          )}
          {donnees.lignes.length === 0 ? (
            <p className="text-sm" style={{ color: C.doux }}>Aucune cliente à relancer avec ces critères.</p>
          ) : (
            <div className="space-y-2">
              {trier(donnees.lignes, tri, "montantTotal").map((l) => (
                <LigneCliente key={l.clientId} ligne={l} type="RELANCE" onMessage={maj}
                  details={`dernier achat le ${fmtDate(l.derniereVente)} (${l.derniereBoutique}) · ${fmt(l.montantTotal)} F au total${l.vendeuse ? ` · vendeuse : ${l.vendeuse}` : ""}`} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ---------- Paires vendues par marque ----------
function BarresMarques({ marques, max }) {
  return (
    <div className="space-y-2">
      {marques.map((m) => (
        <div key={m.marque}>
          <div className="flex items-baseline justify-between gap-3 text-sm mb-1">
            <span className="font-medium truncate">{m.marque}</span>
            <span className="font-mono whitespace-nowrap" style={{ color: m.paires <= 0 ? C.accent : C.texte }}>
              {m.paires} paire{m.paires > 1 ? "s" : ""}{m.paires <= 0 ? " · aucune vente" : ""}
            </span>
          </div>
          <div className="rounded-full overflow-hidden" style={{ height: 8, background: "#F1E8DA" }}>
            <div style={{ width: max > 0 ? `${Math.max(0, (m.paires / max) * 100)}%` : 0, height: "100%", background: C.accent }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PairesParMarque() {
  const [periode, setPeriode] = useState(() => { const [d, f] = periodePreset("mois"); return { preset: "mois", debut: d, fin: f }; });
  const [boutique, setBoutique] = useState("");
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    if (!periode.debut || !periode.fin) return;
    let annule = false;
    setDonnees(null); setErreur("");
    api.suiviClientes.pairesParMarque({ dateDebut: periode.debut, dateFin: periode.fin, boutique })
      .then((r) => { if (!annule) setDonnees(r); })
      .catch((e) => { if (!annule) setErreur(e.message); });
    return () => { annule = true; };
  }, [periode.debut, periode.fin, boutique]);

  const max = donnees ? Math.max(0, ...donnees.marques.map((m) => m.paires)) : 0;

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: C.doux }}>
        Nombre de paires de chaussures vendues par marque (ventes validées, retours déduits). Les marques sans aucune vente apparaissent en bas : ce sont celles à mettre en avant.
      </p>
      <SelecteurPeriode presets={["aujourdhui", "7j", "mois", "moisPrecedent", "3mois", "debut"]} periode={periode} onChange={setPeriode} />
      <div className="mb-5"><SelectBoutique valeur={boutique} onChange={setBoutique} /></div>
      <Erreur message={erreur} />
      {donnees === null && !erreur && <p className="text-sm" style={{ color: C.doux }}>Chargement...</p>}
      {donnees && (
        <div className="rounded-2xl p-5" style={{ background: C.carte, border: `1px solid ${C.bordure}` }}>
          <p className="text-sm mb-4" style={{ color: C.doux }}>Total : <strong style={{ color: C.texte }}>{donnees.totalPaires} paire(s)</strong></p>
          {donnees.marques.length === 0 ? <p className="text-sm" style={{ color: C.doux }}>Aucune marque.</p> : <BarresMarques marques={donnees.marques} max={max} />}
          {donnees.marques.some((m) => m.retournees > 0) && (
            <p className="text-xs mt-4" style={{ color: C.doux }}>
              Retours/échanges déduits : {donnees.marques.filter((m) => m.retournees > 0).map((m) => `${m.marque} (${m.retournees})`).join(", ")}.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

// ---------- Encart de l'accueil ----------
export function EncartPairesParMarque({ onVoirDetail }) {
  const [preset, setPreset] = useState("mois");
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");

  useEffect(() => {
    const [debut, fin] = periodePreset(preset);
    let annule = false;
    setDonnees(null); setErreur("");
    api.suiviClientes.pairesParMarque({ dateDebut: debut, dateFin: fin })
      .then((r) => { if (!annule) setDonnees(r); })
      .catch((e) => { if (!annule) setErreur(e.message); });
    return () => { annule = true; };
  }, [preset]);

  const max = donnees ? Math.max(0, ...donnees.marques.map((m) => m.paires)) : 0;
  const affichees = donnees ? donnees.marques.slice(0, 8) : [];

  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: C.carte, border: `1px solid ${C.bordure}` }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-xs font-mono uppercase tracking-wide" style={{ color: C.accent }}>Paires vendues par marque</p>
        <div className="flex items-center gap-3">
          <select value={preset} onChange={(e) => setPreset(e.target.value)} className="px-2 py-1 rounded-lg text-xs" style={{ border: `1px solid ${C.bordure}`, background: "#fff" }}>
            {["mois", "moisPrecedent", "3mois", "debut"].map((id) => <option key={id} value={id}>{LIBELLES_PERIODE[id]}</option>)}
          </select>
          {onVoirDetail && <button type="button" onClick={onVoirDetail} className="text-xs font-medium" style={{ color: C.accent }}>Voir le détail →</button>}
        </div>
      </div>
      {erreur && <p className="text-xs" style={{ color: C.accent }}>{erreur}</p>}
      {donnees === null && !erreur && <p className="text-sm" style={{ color: C.doux }}>Chargement…</p>}
      {donnees && (donnees.marques.length === 0
        ? <p className="text-sm" style={{ color: C.doux }}>Aucune vente sur cette période.</p>
        : <>
            <BarresMarques marques={affichees} max={max} />
            {(donnees.marques.length > affichees.length || donnees.marques.some((m) => m.paires <= 0)) && (
              <p className="text-xs mt-3" style={{ color: C.doux }}>
                {donnees.marques.length > affichees.length ? `+ ${donnees.marques.length - affichees.length} autre(s) marque(s) dans le détail. ` : ""}
                {donnees.marques.filter((m) => m.paires <= 0).length > 0 ? `${donnees.marques.filter((m) => m.paires <= 0).length} marque(s) sans aucune vente sur la période.` : ""}
              </p>
            )}
          </>)}
    </div>
  );
}

// ---------- Clientes avec un bonus à appeler ----------
const TRIS_BONUS = [["bonus", "Bonus le plus élevé"], ["cumul", "Cumul le plus élevé"], ["ancienne", "Dernier achat le plus ancien"]];

function trierBonus(lignes, mode) {
  const copie = [...lignes];
  const dernier = (l) => (l.derniereVente ? new Date(l.derniereVente).getTime() : Infinity);
  if (mode === "cumul") copie.sort((a, b) => b.cumulFideliteCourant - a.cumulFideliteCourant);
  else if (mode === "ancienne") copie.sort((a, b) => dernier(a) - dernier(b));
  else copie.sort((a, b) => b.bonusDisponible - a.bonusDisponible || b.cumulFideliteCourant - a.cumulFideliteCourant);
  return copie;
}

export function BonusAAppeler() {
  const [avecTel, setAvecTel] = useState(true);
  const [masquer, setMasquer] = useState(true);
  const [tri, setTri] = useState("bonus");
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");
  const maj = useMajLigne(setDonnees);

  useEffect(() => {
    let annule = false;
    setDonnees(null); setErreur("");
    api.suiviClientes.bonusAAppeler({ avecTelephone: avecTel ? "1" : "", nonEnvoyes: masquer ? "1" : "" })
      .then((r) => { if (!annule) setDonnees(r); })
      .catch((e) => { if (!annule) setErreur(e.message); });
    return () => { annule = true; };
  }, [avecTel, masquer]);

  const lignes = donnees ? trierBonus(donnees.lignes, tri) : [];
  return (
    <div>
      <p className="text-sm mb-4" style={{ color: C.doux }}>
        Les clientes qui ont un bonus Cendrillon prêt à être déduit. Appelez-les ou écrivez-leur pour qu'elles viennent l'utiliser : le bonus se déduit à la caisse, il n'est pas appliqué sur une livraison, et seulement pour un achat au moins égal à son montant.
      </p>
      <div className="flex flex-wrap items-end gap-4 mb-4">
        <Case label="Seulement celles avec un téléphone" checked={avecTel} onChange={setAvecTel} />
        <Case label="Masquer celles déjà appelées" checked={masquer} onChange={setMasquer} />
        <SelectTri valeur={tri} options={TRIS_BONUS} onChange={setTri} />
      </div>
      {erreur && <p className="text-sm mb-3" style={{ color: C.accent }}>{erreur}</p>}
      {donnees === null && !erreur && <p className="text-sm" style={{ color: C.doux }}>Chargement…</p>}
      {donnees && (
        <>
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <p className="text-sm font-medium">{lignes.length} cliente(s) à appeler · {fmt(donnees.totalBonus)} F de bonus à utiliser</p>
            <BoutonExport nombre={lignes.length} onClick={() => exporterCsv("clientes-bonus-a-appeler",
              ["Nom et prénoms", "Téléphone", "WhatsApp", "Bonus disponible (F)", "Cumul courant (F)", "Dernier achat", "Appelée le"],
              lignes.map((l) => [l.nomPrenoms, { __numero: l.telephone }, { __numero: l.whatsapp }, l.bonusDisponible, l.cumulFideliteCourant, l.derniereVente ? fmtDate(l.derniereVente) : "", l.dejaEnvoye ? fmtDate(l.dernierMessage?.createdAt) : ""]))} />
          </div>
          <Explication>
            {donnees.nbAvecBonus} cliente(s) ont un bonus disponible
            {donnees.diagnostic?.nbMasqueesTelephone > 0 ? `, ${donnees.diagnostic.nbMasqueesTelephone} masquée(s) faute de téléphone` : ""}
            {donnees.diagnostic?.nbMasqueesDejaAppelees > 0 ? `, ${donnees.diagnostic.nbMasqueesDejaAppelees} masquée(s) car déjà appelée(s)` : ""}.
            Une cliente appelée revient dans la liste si elle rachète ensuite.
          </Explication>
          {lignes.length === 0
            ? <p className="text-sm" style={{ color: C.doux }}>Aucune cliente à appeler avec ces critères.</p>
            : <div className="space-y-2">
                {lignes.map((l) => (
                  <LigneCliente key={l.clientId} ligne={l} type="BONUS" onMessage={maj}
                    details={`cumul ${fmt(l.cumulFideliteCourant)} F${l.derniereVente ? ` · dernier achat le ${fmtDate(l.derniereVente)}` : ""}`} />
                ))}
              </div>}
        </>
      )}
    </div>
  );
}

// Encart de l'accueil : les premières clientes à appeler, avec WhatsApp et "Appelée" directement.
export function EncartBonusAAppeler({ onVoirTout }) {
  const [donnees, setDonnees] = useState(null);
  const [erreur, setErreur] = useState("");
  const maj = useMajLigne(setDonnees);

  useEffect(() => {
    let annule = false;
    api.suiviClientes.bonusAAppeler({ avecTelephone: "1", nonEnvoyes: "1" })
      .then((r) => { if (!annule) setDonnees(r); })
      .catch((e) => { if (!annule) setErreur(e.message); });
    return () => { annule = true; };
  }, []);

  const affichees = donnees ? donnees.lignes.slice(0, 5) : [];
  return (
    <div className="rounded-2xl p-5 mb-6" style={{ background: C.carte, border: `1px solid ${C.bordure}` }}>
      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
        <p className="text-xs font-mono uppercase tracking-wide" style={{ color: C.accent }}>Clientes avec un bonus à utiliser</p>
        {onVoirTout && <button type="button" onClick={onVoirTout} className="text-xs font-medium" style={{ color: C.accent }}>Voir tout →</button>}
      </div>
      {erreur && <p className="text-xs" style={{ color: C.accent }}>{erreur}</p>}
      {donnees === null && !erreur && <p className="text-sm" style={{ color: C.doux }}>Chargement…</p>}
      {donnees && (donnees.lignes.length === 0
        ? <p className="text-sm" style={{ color: C.doux }}>Aucune cliente avec un bonus à appeler pour l'instant.</p>
        : <>
            <p className="text-sm font-medium mb-3">{donnees.lignes.length} cliente(s) à appeler · {fmt(donnees.totalBonus)} F de bonus à utiliser</p>
            <div className="space-y-2">
              {affichees.map((l) => (
                <LigneCliente key={l.clientId} ligne={l} type="BONUS" onMessage={maj}
                  details={`cumul ${fmt(l.cumulFideliteCourant)} F`} />
              ))}
            </div>
            {donnees.lignes.length > affichees.length && <p className="text-xs mt-3" style={{ color: C.doux }}>+ {donnees.lignes.length - affichees.length} autre(s) dans la liste complète.</p>}
          </>)}
    </div>
  );
}
