import { useState, useEffect, useCallback } from "react";
import { Calendar, CreditCard, Store, Lock } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";

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
      else res = await api.etats.parType(params);
      setDonnees(res);
    } catch (e) {
      setErreur(e.message || "Erreur lors du chargement de l'état.");
      setDonnees(null);
    } finally {
      setChargement(false);
    }
  }, [sousOnglet, dateDebut, dateFin, boutique, estAdmin]);

  useEffect(() => { charger(); }, [charger]);

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
        <button onClick={ouvrirFermeture} disabled={chargementFermeture}
          className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
          style={{ background: COULEUR.accent, color: "#FBF3EC" }}>
          <Lock size={14} /> {chargementFermeture ? "Calcul..." : "Fermeture de caisse"}
        </button>
      </div>

      <div className="flex items-end gap-3 flex-wrap mb-6 p-4 rounded-2xl" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
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
        <div className="mb-6 p-5 rounded-2xl" style={{ background: "#FFFDF9", border: `1px solid ${COULEUR.accent}` }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display text-lg font-semibold">Fermeture de caisse — {fermeture.date} ({fermeture.boutique})</h3>
            <button onClick={() => setFermeture(null)} className="text-sm" style={{ color: COULEUR.texteDoux }}>Fermer</button>
          </div>
          <p className="text-sm mb-1">Nombre de ventes : <strong>{fermeture.nombreVentes}</strong></p>
          <p className="text-sm mb-1">Total des ventes : <strong>{formatFCFA(fermeture.totalVentes)}</strong></p>
          <p className="text-sm mb-3">Total monnaie rendue : <strong>{formatFCFA(fermeture.totalMonnaieRendue)}</strong></p>
          <table className="w-full text-sm">
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
        </div>
      )}

      {chargement && <p className="text-sm" style={{ color: COULEUR.texteDoux }}>Chargement...</p>}

      {!chargement && donnees?.ventes && sousOnglet === "date" && (
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
                  <td className="px-4 py-2">{v.vendeur?.prenom} {v.vendeur?.nom}</td>
                  <td className="px-4 py-2">{v.modeVente}</td>
                  <td className="text-right px-4 py-2">{formatFCFA(v.total)}</td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr style={{ borderTop: `2px solid ${COULEUR.texte}`, fontWeight: 600 }}>
                <td className="px-4 py-2" colSpan={5}>Total ({donnees.nombre} vente{donnees.nombre > 1 ? "s" : ""})</td>
                <td className="text-right px-4 py-2">{formatFCFA(donnees.total)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {!chargement && donnees?.recap && sousOnglet === "mode" && (
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
                  <td className="px-4 py-2">{r.mode}</td>
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
    </div>
  );
}