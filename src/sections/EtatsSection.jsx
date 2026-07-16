import { useState, useEffect, useCallback } from "react";
import { Calendar, CreditCard, Store, Lock, Award, Download, ChevronDown, Printer } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { MODES_PAIEMENT } from "../constants.js";

const COULEUR = { fond: "#FAF7F2", carte: "#FFFDF9", bordure: "#DDD3C4", texte: "#2B2320", texteDoux: "#6B5D52", accent: "#8C3B2E" };

function formatFCFA(n) {
  return `${(n || 0).toLocaleString("fr-FR")} FCFA`;
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function EtatsSection() {
  const { user } = useAuth();
  const estAdmin = !!user?.role?.systeme;

  const [sousOnglet, setSousOnglet] = useState("date");
  const [dateDebut, setDateDebut] = useState(todayISO());
  const [dateFin, setDateFin] = useState(todayISO());
  const [boutique, setBoutique] = useState("");

  const [donnees, setDonnees] = useState(null);
  const [chargement, setChargement] = useState(false);
  const [erreur, setErreur] = useState("");

  const [fermeture, setFermeture] = useState(null);
  const [chargementFermeture, setChargementFermeture] = useState(false);
  const [periodeOuverte, setPeriodeOuverte] = useState(false);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    setDonnees(null);
    const params = { dateDebut, dateFin };
    if (estAdmin && boutique) params.boutique = boutique;
    try {
      let res;
      if (sousOnglet === "date") res = await api.etats.parDate(params);
      else if (sousOnglet === "mode") res = await api.etats.parModePaiement(params);
      else if (sousOnglet === "type") res = await api.etats.parType(params);
      else if (sousOnglet === "vendeur") res = await api.etats.parVendeur(params);
      else res = await api.etats.recapBoutiques({ dateDebut, dateFin });
      setDonnees(res);
    } catch (e) {
      setErreur(e.message || "Erreur lors du chargement de l'état.");
      setDonnees(null);
    } finally {
      setChargement(false);
    }
  }, [sousOnglet, dateDebut, dateFin, boutique, estAdmin]);

  useEffect(() => { charger(); }, [charger]);

  // Impression automatique dès qu'une fermeture de caisse est calculée
  useEffect(() => {
    if (fermeture) {
      const timer = setTimeout(() => window.print(), 300);
      return () => clearTimeout(timer);
    }
  }, [fermeture]);

  const iso = (d) => d.toISOString().slice(0, 10);

  const appliquerPeriode = (type) => {
    const aujourdhui = new Date();
    let debut = new Date(aujourdhui);
    let fin = new Date(aujourdhui);

    if (type === "aujourdhui") {
      // debut = fin = aujourd'hui
    } else if (type === "hier") {
      debut.setDate(debut.getDate() - 1);
      fin.setDate(fin.getDate() - 1);
    } else if (type === "semaine-cours") {
      const jour = (debut.getDay() + 6) % 7; // lundi = 0
      debut.setDate(debut.getDate() - jour);
    } else if (type === "semaine-precedente") {
      const jour = (debut.getDay() + 6) % 7;
      debut.setDate(debut.getDate() - jour - 7);
      fin = new Date(debut);
      fin.setDate(fin.getDate() + 6);
    } else if (type === "mois-cours") {
      debut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 1);
    } else if (type === "mois-precedent") {
      debut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1);
      fin = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth(), 0);
    } else if (type === "deux-derniers-mois") {
      debut = new Date(aujourdhui.getFullYear(), aujourdhui.getMonth() - 1, 1);
    } else if (type === "annee-cours") {
      debut = new Date(aujourdhui.getFullYear(), 0, 1);
    }

    setDateDebut(iso(debut));
    setDateFin(iso(fin));
    setPeriodeOuverte(false);
  };

  const PERIODES = [
    { id: "aujourdhui", label: "Aujourd'hui" },
    { id: "hier", label: "Hier" },
    { id: "semaine-cours", label: "Semaine en cours" },
    { id: "semaine-precedente", label: "Semaine précédente" },
    { id: "mois-cours", label: "Mois en cours" },
    { id: "mois-precedent", label: "Mois précédent" },
    { id: "deux-derniers-mois", label: "Deux derniers mois" },
    { id: "annee-cours", label: "Année en cours" },
  ];

  const exportCSV = () => {
    let lignes = [];
    let nomFichier = "export";

    if (sousOnglet === "date" && donnees?.ventes) {
      lignes.push(["N°", "Date", "Boutique", "Vendeur", "Type", "Total"]);
      donnees.ventes.forEach((v) => {
        lignes.push([v.numero, new Date(v.date).toLocaleString("fr-FR"), v.boutique, v.vendeur?.nom || "", v.modeVente, v.total]);
      });
      lignes.push(["", "", "", "", "Total net", donnees.total]);
      nomFichier = `etat-par-date_${dateDebut}_${dateFin}`;
    } else if (sousOnglet === "mode" && donnees?.recap) {
      lignes.push(["Mode de paiement", "Nombre", "Montant"]);
      donnees.recap.forEach((r) => {
        lignes.push([MODES_PAIEMENT.find((m) => m.id === r.mode)?.label || r.mode, r.nombre, r.montant]);
      });
      lignes.push(["", "Total", donnees.total]);
      nomFichier = `etat-par-mode-paiement_${dateDebut}_${dateFin}`;
    } else if (sousOnglet === "type" && donnees?.recap) {
      lignes.push(["Type de vente", "Nombre", "Montant"]);
      donnees.recap.forEach((r) => {
        lignes.push([r.modeVente, r.nombre, r.montant]);
      });
      lignes.push(["", "Total", donnees.total]);
      nomFichier = `etat-par-type_${dateDebut}_${dateFin}`;
    } else if (sousOnglet === "vendeur" && donnees?.classement) {
      lignes.push(["Rang", "Vendeuse", "Boutique", "Nombre de ventes", "Panier moyen", "Montant vendu"]);
      donnees.classement.forEach((v, i) => {
        lignes.push([i + 1, v.nom, v.boutique, v.nombre, v.panierMoyen, v.montant]);
      });
      nomFichier = `etat-par-vendeur_${dateDebut}_${dateFin}`;
    } else if (sousOnglet === "recap" && donnees?.parBoutique) {
      lignes.push(["Boutique", "Nombre de ventes", "Total des ventes", "Retours traités", "Total règlements"]);
      donnees.parBoutique.forEach((b) => {
        lignes.push([b.boutique, b.nombreVentes, b.totalVentes, b.totalRetours, b.totalReglements]);
      });
      lignes.push(["Cumul", donnees.cumul.nombreVentes, donnees.cumul.totalVentes, donnees.cumul.totalRetours, donnees.cumul.totalReglements]);
      nomFichier = `etat-recap-boutiques_${dateDebut}_${dateFin}`;
    } else {
      return;
    }

    const csv = lignes.map((ligne) => ligne.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(";")).join("\r\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${nomFichier}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const ouvrirFermeture = async () => {
    setChargementFermeture(true);
    setErreur("");
    try {
      const params = { date: dateFin };
      if (estAdmin && boutique) params.boutique = boutique;
      const res = await api.etats.fermetureCaisse(params);
      setFermeture(res);
    } catch (e) {
      setErreur(e.message || "Erreur lors du calcul de la fermeture de caisse.");
    } finally {
      setChargementFermeture(false);
    }
  };

  const SOUS_ONGLETS = [
    { id: "date", label: "Par date", icon: Calendar },
    { id: "mode", label: "Par mode de paiement", icon: CreditCard },
    { id: "type", label: "Par type", icon: Store },
    { id: "vendeur", label: "Meilleur vendeur", icon: Award },
    ...(estAdmin ? [{ id: "recap", label: "Récap boutiques", icon: Store }] : []),
  ];

  return (
    <div>
      <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
        <div className="flex gap-2 flex-wrap">
          {SOUS_ONGLETS.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setSousOnglet(id)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
              style={sousOnglet === id ? { background: COULEUR.texte, color: "#FBF3EC" } : { background: "transparent", color: COULEUR.texteDoux, border: `1px solid ${COULEUR.bordure}` }}>
              <Icon size={14} /> {label}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button onClick={exportCSV} disabled={chargement || !donnees}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
            style={{ border: `1px solid ${COULEUR.bordure}`, color: COULEUR.texteDoux, opacity: (chargement || !donnees) ? 0.5 : 1 }}>
            <Download size={14} /> Exporter CSV
          </button>
          <button onClick={ouvrirFermeture} disabled={chargementFermeture}
            className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
            style={{ background: COULEUR.accent, color: "#FBF3EC" }}>
            <Lock size={14} /> {chargementFermeture ? "Calcul..." : "Fermeture de caisse"}
          </button>
        </div>
      </div>

      <div className="flex items-end gap-3 flex-wrap mb-6 p-4 rounded-2xl" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
        <div className="relative">
          <label className="block text-xs mb-1" style={{ color: COULEUR.texteDoux }}>Période</label>
          <button type="button" onClick={() => setPeriodeOuverte((o) => !o)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm"
            style={{ border: `1px solid ${COULEUR.bordure}`, background: "#fff", color: COULEUR.texte }}>
            Choisir <ChevronDown size={14} />
          </button>
          {periodeOuverte && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setPeriodeOuverte(false)} />
              <div className="absolute z-20 mt-1 rounded-lg overflow-hidden" style={{ background: "#fff", border: `1px solid ${COULEUR.bordure}`, minWidth: "180px", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
                {PERIODES.map((p) => (
                  <button key={p.id} type="button" onClick={() => appliquerPeriode(p.id)}
                    className="w-full text-left px-3 py-2 text-sm"
                    style={{ background: "#fff", color: COULEUR.texte }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = COULEUR.fond)}
                    onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}>
                    {p.label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: COULEUR.texteDoux }}>Du</label>
          <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COULEUR.bordure}`, background: "#fff" }} />
        </div>
        <div>
          <label className="block text-xs mb-1" style={{ color: COULEUR.texteDoux }}>Au</label>
          <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
            className="px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COULEUR.bordure}`, background: "#fff" }} />
        </div>
        {estAdmin && (
          <div>
            <label className="block text-xs mb-1" style={{ color: COULEUR.texteDoux }}>Boutique</label>
            <select value={boutique} onChange={(e) => setBoutique(e.target.value)}
              className="px-3 py-2 rounded-lg text-sm" style={{ border: `1px solid ${COULEUR.bordure}`, background: "#fff" }}>
              <option value="">Toutes les boutiques</option>
              <option value="Angré">Angré</option>
              <option value="Koumassi">Koumassi</option>
            </select>
          </div>
        )}
      </div>

      {erreur && <p className="text-sm mb-4" style={{ color: COULEUR.accent }}>{erreur}</p>}

      {fermeture && (
        <div className="mb-6 p-5 rounded-2xl print-area" id="fermeture-caisse-print" style={{ background: "#FFFDF9", border: `1px solid ${COULEUR.accent}` }}>
          <div className="flex items-center justify-between mb-3 no-print">
            <h3 className="font-display text-lg font-semibold">Fermeture de caisse — {fermeture.date} ({fermeture.boutique})</h3>
            <div className="flex gap-3 items-center">
              <button onClick={() => window.print()} className="flex items-center gap-1.5 text-sm px-3 py-1.5 rounded-lg" style={{ background: COULEUR.accent, color: "#FBF3EC" }}><Printer size={14} /> Imprimer</button>
              <button onClick={() => setFermeture(null)} className="text-sm" style={{ color: COULEUR.texteDoux }}>Fermer</button>
            </div>
          </div>
          <p className="text-center font-display font-semibold text-base mb-2 hidden print:block">Fermeture de caisse — {fermeture.date} ({fermeture.boutique})</p>
          <p className="text-sm mb-1">Nombre de ventes : <strong>{fermeture.nombreVentes}</strong></p>
          <p className="text-sm mb-1">Total des ventes (net) : <strong>{formatFCFA(fermeture.totalVentes)}</strong></p>
          <p className="text-sm mb-1">Cartes cadeaux utilisées : <strong>{formatFCFA(fermeture.totalCartesCadeauxUtilisees)}</strong></p>
          <p className="text-sm mb-1">Retours traités (avoirs générés) : <strong>- {formatFCFA(fermeture.totalRetours)}</strong></p>
          <p className="text-sm mb-1">Total monnaie rendue : <strong>{formatFCFA(fermeture.totalMonnaieRendue)}</strong></p>
          <p className="text-sm mb-1">Règlements de crédit reçus aujourd'hui : <strong style={{ color: COULEUR.accent }}>+ {formatFCFA(fermeture.totalReglementsRecus)}</strong></p>
          <p className="text-sm mb-1">Cartes cadeaux vendues aujourd'hui : <strong style={{ color: COULEUR.accent }}>+ {formatFCFA(fermeture.totalCartesCadeauxVendues)}</strong></p>
          <p className="text-sm font-semibold mb-3" style={{ borderTop: `1px solid ${COULEUR.bordure}`, paddingTop: "8px" }}>Total encaissé (caisse) : <strong>{formatFCFA(fermeture.totalEncaisseGlobal)}</strong></p>

          <p className="text-xs font-semibold mb-1" style={{ color: COULEUR.texteDoux }}>Répartition par mode de paiement</p>
          <table className="w-full text-sm mb-4">
            <thead><tr style={{ color: COULEUR.texteDoux }}><th className="text-left py-1">Mode</th><th className="text-right py-1">Montant</th></tr></thead>
            <tbody>
              {fermeture.parMode.map((m) => (
                <tr key={m.mode} style={{ borderTop: `1px solid ${COULEUR.bordure}` }}>
                  <td className="py-1">{m.mode}</td>
                  <td className="text-right py-1">{formatFCFA(m.montant)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          {fermeture.reglementsDetail.length > 0 && (
            <>
              <p className="text-xs font-semibold mb-1" style={{ color: COULEUR.texteDoux }}>Détail des règlements de crédit reçus</p>
              <table className="w-full text-sm mb-4">
                <thead><tr style={{ color: COULEUR.texteDoux }}><th className="text-left py-1">Vente</th><th className="text-left py-1">Client</th><th className="text-left py-1">Mode</th><th className="text-right py-1">Montant</th></tr></thead>
                <tbody>
                  {fermeture.reglementsDetail.map((r, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${COULEUR.bordure}` }}>
                      <td className="py-1">{r.venteNumero}</td>
                      <td className="py-1">{r.clientNom}</td>
                      <td className="py-1">{MODES_PAIEMENT.find((m) => m.id === r.mode)?.label || r.mode}</td>
                      <td className="text-right py-1">{formatFCFA(r.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}

          {fermeture.cartesCadeauxVenduesDetail?.length > 0 && (
            <>
              <p className="text-xs font-semibold mb-1" style={{ color: COULEUR.texteDoux }}>Détail des cartes cadeaux vendues</p>
              <table className="w-full text-sm">
                <thead><tr style={{ color: COULEUR.texteDoux }}><th className="text-left py-1">Numéro</th><th className="text-left py-1">Mode</th><th className="text-right py-1">Montant</th></tr></thead>
                <tbody>
                  {fermeture.cartesCadeauxVenduesDetail.map((c, i) => (
                    <tr key={i} style={{ borderTop: `1px solid ${COULEUR.bordure}` }}>
                      <td className="py-1">{c.numero}</td>
                      <td className="py-1">{MODES_PAIEMENT.find((m) => m.id === c.mode)?.label || c.mode}</td>
                      <td className="text-right py-1">{formatFCFA(c.montant)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </div>
      )}

      {chargement && <p className="text-sm" style={{ color: COULEUR.texteDoux }}>Chargement...</p>}

      {!chargement && donnees?.ventes && sousOnglet === "date" && (
        <>
          <div className="grid sm:grid-cols-3 gap-4 mb-4">
            <div className="rounded-2xl p-4" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
              <p className="text-xs mb-1" style={{ color: COULEUR.texteDoux }}>Cartes cadeaux vendues</p>
              <p className="font-display text-lg font-semibold" style={{ color: COULEUR.accent }}>+ {formatFCFA(donnees.totalCartesCadeauxVendues)}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
              <p className="text-xs mb-1" style={{ color: COULEUR.texteDoux }}>Cartes cadeaux utilisées</p>
              <p className="font-display text-lg font-semibold">{formatFCFA(donnees.totalCartesCadeauxUtilisees)}</p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
              <p className="text-xs mb-1" style={{ color: COULEUR.texteDoux }}>Retours traités (avoirs générés)</p>
              <p className="font-display text-lg font-semibold" style={{ color: COULEUR.accent }}>- {formatFCFA(donnees.totalRetours)}</p>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: COULEUR.fond, color: COULEUR.texteDoux }}>
                  <th className="text-left px-4 py-2">N°</th>
                  <th className="text-left px-4 py-2">Date</th>
                  <th className="text-left px-4 py-2">Boutique</th>
                  <th className="text-left px-4 py-2">Vendeur</th>
                  <th className="text-left px-4 py-2">Type</th>
                  <th className="text-right px-4 py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {donnees.ventes.map((v) => (
                  <tr key={v.id} style={{ borderTop: `1px solid ${COULEUR.bordure}` }}>
                    <td className="px-4 py-2">{v.numero}</td>
                    <td className="px-4 py-2">{new Date(v.date).toLocaleString("fr-FR")}</td>
                    <td className="px-4 py-2">{v.boutique}</td>
                    <td className="px-4 py-2">{v.vendeur?.nom}</td>
                    <td className="px-4 py-2">{v.modeVente}</td>
                    <td className="text-right px-4 py-2">{formatFCFA(v.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${COULEUR.texte}`, fontWeight: 600 }}>
                  <td className="px-4 py-2" colSpan={5}>Total net ({donnees.nombre} vente{donnees.nombre > 1 ? "s" : ""})</td>
                  <td className="text-right px-4 py-2">{formatFCFA(donnees.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {!chargement && donnees?.recap && sousOnglet === "mode" && (
        <>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <div className="rounded-2xl p-4" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
              <p className="text-xs mb-1" style={{ color: COULEUR.texteDoux }}>Liquidités (Espèces)</p>
              <p className="font-display text-xl font-semibold" style={{ color: COULEUR.accent }}>
                {formatFCFA(donnees.recap.filter((r) => MODES_PAIEMENT.find((m) => m.id === r.mode)?.liquide).reduce((s, r) => s + r.montant, 0))}
              </p>
            </div>
            <div className="rounded-2xl p-4" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
              <p className="text-xs mb-1" style={{ color: COULEUR.texteDoux }}>Non liquidités (Mobile Money, Carte, Bon d'achat, Avoir...)</p>
              <p className="font-display text-xl font-semibold" style={{ color: COULEUR.accent }}>
                {formatFCFA(donnees.recap.filter((r) => !MODES_PAIEMENT.find((m) => m.id === r.mode)?.liquide).reduce((s, r) => s + r.montant, 0))}
              </p>
            </div>
          </div>
          <div className="rounded-2xl overflow-hidden" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: COULEUR.fond, color: COULEUR.texteDoux }}>
                  <th className="text-left px-4 py-2">Mode de paiement</th>
                  <th className="text-right px-4 py-2">Nombre</th>
                  <th className="text-right px-4 py-2">Montant</th>
                </tr>
              </thead>
              <tbody>
                {donnees.recap.map((r) => (
                  <tr key={r.mode} style={{ borderTop: `1px solid ${COULEUR.bordure}` }}>
                    <td className="px-4 py-2">{MODES_PAIEMENT.find((m) => m.id === r.mode)?.label || r.mode}</td>
                    <td className="text-right px-4 py-2">{r.nombre}</td>
                    <td className="text-right px-4 py-2">{formatFCFA(r.montant)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr style={{ borderTop: `2px solid ${COULEUR.texte}`, fontWeight: 600 }}>
                  <td className="px-4 py-2" colSpan={2}>Total</td>
                  <td className="text-right px-4 py-2">{formatFCFA(donnees.total)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {!chargement && donnees?.recap && sousOnglet === "type" && (
        <div className="rounded-2xl overflow-hidden" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
          <table className="w-full text-sm">
            <thead>
              <tr style={{ background: COULEUR.fond, color: COULEUR.texteDoux }}>
                <th className="text-left px-4 py-2">Type de vente</th>
                <th className="text-right px-4 py-2">Nombre</th>
                <th className="text-right px-4 py-2">Montant</th>
              </tr>
            </thead>
            <tbody>
              {donnees.recap.map((r) => (
                <tr key={r.modeVente} style={{ borderTop: `1px solid ${COULEUR.bordure}` }}>
                  <td className="px-4 py-2">{r.modeVente}</td>
                  <td className="text-right px-4 py-2">{r.nombre}</td>
                  <td className="text-right px-4 py-2">{formatFCFA(r.montant)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${COULEUR.texte}`, fontWeight: 600 }}>
                <td className="px-4 py-2" colSpan={2}>Total</td>
                <td className="text-right px-4 py-2">{formatFCFA(donnees.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!chargement && donnees?.classement && sousOnglet === "vendeur" && (
        <div className="space-y-4">
          {donnees.meilleur && (
            <div className="rounded-2xl p-5" style={{ background: COULEUR.texte, color: "#FBF3EC" }}>
              <p className="text-xs opacity-80 mb-1 flex items-center gap-1.5"><Award size={14} /> Meilleure vendeuse de la période</p>
              <p className="font-display text-xl font-semibold">{donnees.meilleur.nom} — {donnees.meilleur.boutique}</p>
              <div className="grid grid-cols-3 gap-4 mt-3">
                <div><p className="text-xs opacity-80">Montant vendu</p><p className="font-display text-lg font-semibold">{formatFCFA(donnees.meilleur.montant)}</p></div>
                <div><p className="text-xs opacity-80">Nombre de ventes</p><p className="font-display text-lg font-semibold">{donnees.meilleur.nombre}</p></div>
                <div><p className="text-xs opacity-80">Panier moyen</p><p className="font-display text-lg font-semibold">{formatFCFA(donnees.meilleur.panierMoyen)}</p></div>
              </div>
            </div>
          )}
          <div className="rounded-2xl overflow-hidden" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: COULEUR.fond, color: COULEUR.texteDoux }}>
                  <th className="text-left px-4 py-2">Rang</th>
                  <th className="text-left px-4 py-2">Vendeuse</th>
                  <th className="text-left px-4 py-2">Boutique</th>
                  <th className="text-right px-4 py-2">Nombre de ventes</th>
                  <th className="text-right px-4 py-2">Panier moyen</th>
                  <th className="text-right px-4 py-2">Montant vendu</th>
                </tr>
              </thead>
              <tbody>
                {donnees.classement.length === 0 && (
                  <tr><td className="px-4 py-3 text-sm" colSpan={6} style={{ color: COULEUR.texteDoux }}>Aucune vente sur cette période.</td></tr>
                )}
                {donnees.classement.map((v, i) => (
                  <tr key={v.vendeurId} style={{ borderTop: `1px solid ${COULEUR.bordure}` }}>
                    <td className="px-4 py-2">{i + 1}</td>
                    <td className="px-4 py-2">{v.nom}</td>
                    <td className="px-4 py-2">{v.boutique}</td>
                    <td className="text-right px-4 py-2">{v.nombre}</td>
                    <td className="text-right px-4 py-2">{formatFCFA(v.panierMoyen)}</td>
                    <td className="text-right px-4 py-2">{formatFCFA(v.montant)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {!chargement && donnees?.parBoutique && sousOnglet === "recap" && (
        <div className="space-y-4">
          {donnees.parBoutique.map((b) => (
            <div key={b.boutique} className="rounded-2xl p-5" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
              <p className="font-display text-lg font-semibold mb-3">{b.boutique}</p>
              <div className="grid sm:grid-cols-4 gap-4">
                <div>
                  <p className="text-xs" style={{ color: COULEUR.texteDoux }}>Total des ventes ({b.nombreVentes})</p>
                  <p className="font-display text-xl font-semibold" style={{ color: COULEUR.accent }}>{formatFCFA(b.totalVentes)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: COULEUR.texteDoux }}>Retours traités</p>
                  <p className="font-display text-xl font-semibold" style={{ color: COULEUR.accent }}>- {formatFCFA(b.totalRetours)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: COULEUR.texteDoux }}>Total des règlements encaissés</p>
                  <p className="font-display text-xl font-semibold" style={{ color: COULEUR.accent }}>{formatFCFA(b.totalReglements)}</p>
                </div>
                <div>
                  <p className="text-xs" style={{ color: COULEUR.texteDoux }}>Cartes cadeaux vendues</p>
                  <p className="font-display text-xl font-semibold" style={{ color: COULEUR.accent }}>{formatFCFA(b.totalCartesCadeauxVendues)}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="rounded-2xl p-5" style={{ background: COULEUR.texte, color: "#FBF3EC" }}>
            <p className="font-display text-lg font-semibold mb-3">Cumul des 2 boutiques</p>
            <div className="grid sm:grid-cols-4 gap-4">
              <div>
                <p className="text-xs opacity-80">Total des ventes ({donnees.cumul.nombreVentes})</p>
                <p className="font-display text-xl font-semibold">{formatFCFA(donnees.cumul.totalVentes)}</p>
              </div>
              <div>
                <p className="text-xs opacity-80">Retours traités</p>
                <p className="font-display text-xl font-semibold">- {formatFCFA(donnees.cumul.totalRetours)}</p>
              </div>
              <div>
                <p className="text-xs opacity-80">Total des règlements encaissés</p>
                <p className="font-display text-xl font-semibold">{formatFCFA(donnees.cumul.totalReglements)}</p>
              </div>
              <div>
                <p className="text-xs opacity-80">Cartes cadeaux vendues</p>
                <p className="font-display text-xl font-semibold">{formatFCFA(donnees.cumul.totalCartesCadeauxVendues)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
