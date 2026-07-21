import { useState, useEffect, useCallback } from "react";
import { TrendingUp, ShoppingBag, AlertTriangle, CreditCard, Award, Cake } from "lucide-react";
import { api } from "../api.js";
import { useAuth } from "../context/AuthContext.jsx";
import { fmt, MOIS } from "../constants.js";

const COULEUR = { fond: "#FAF7F2", carte: "#FFFFFF", bordure: "#EAE1D2", texte: "#2B2320", texteDoux: "#6B5D52", accent: "#8C3B2E" };
const SEUIL_STOCK_FAIBLE = 3;

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}
function debutSemaineISO() {
  const d = new Date();
  const jour = d.getDay();
  const decalage = jour === 0 ? 6 : jour - 1;
  d.setDate(d.getDate() - decalage);
  return d.toISOString().slice(0, 10);
}

export default function DashboardSection() {
  const { user, permissions } = useAuth();
  const estAdmin = !!user?.role?.systeme;
  const peutVoirVentes = !!permissions.ventes;
  const peutVoirStock = !!permissions.stock;

  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState("");
  const [caJour, setCaJour] = useState(null);
  const [alertesStock, setAlertesStock] = useState([]);
  const [credits, setCredits] = useState(null);
  const [meilleurVendeur, setMeilleurVendeur] = useState(null);
  const [anniversaires, setAnniversaires] = useState([]);

  const charger = useCallback(async () => {
    setChargement(true);
    setErreur("");
    try {
      const jour = todayISO();

      if (peutVoirVentes) {
        if (estAdmin) {
          const recap = await api.etats.recapBoutiques({ dateDebut: jour, dateFin: jour });
          setCaJour({ parBoutique: recap.parBoutique, cumul: recap.cumul });
        } else {
          const res = await api.etats.parDate({ dateDebut: jour, dateFin: jour });
          setCaJour({ parBoutique: [{ boutique: user.boutique, totalVentes: res.total, nombreVentes: res.nombre }], cumul: { totalVentes: res.total, nombreVentes: res.nombre } });
        }

        const paramsBoutique = estAdmin ? {} : { boutique: user.boutique };
        const [creditListe, vendeurRes] = await Promise.all([
          api.ventes.creditListe(paramsBoutique),
          api.etats.parVendeur({ ...paramsBoutique, dateDebut: debutSemaineISO(), dateFin: jour }),
        ]);
        const enAttente = creditListe.filter((v) => v.resteAPayer > 0);
        const clientsUniques = new Set(enAttente.map((v) => v.clientId));
        setCredits({
          total: enAttente.reduce((s, v) => s + v.resteAPayer, 0),
          nombreClients: clientsUniques.size,
          top: [...enAttente].sort((a, b) => b.resteAPayer - a.resteAPayer).slice(0, 5),
        });
        setMeilleurVendeur(vendeurRes.meilleur);
      }

      if (estAdmin) {
        const clients = await api.clients.list();
        const aujourdhui = new Date();
        const jourAujourdhui = aujourdhui.getDate();
        const moisAujourdhui = MOIS[aujourdhui.getMonth()];
        const bientot = clients.filter((c) => parseInt(c.jourAnniv, 10) === jourAujourdhui && c.moisAnniv === moisAujourdhui);
        setAnniversaires(bientot);
      }      

    if (peutVoirStock) {
        const articles = await api.articles.list();
        const alertes = [];
        for (const a of articles) {
          for (const s of a.stocks || []) {
            if (!estAdmin && s.boutique !== user.boutique) continue;
            if (s.quantite <= SEUIL_STOCK_FAIBLE) {
              alertes.push({ designation: a.designation, reference: a.reference, boutique: s.boutique, pointure: s.pointure, quantite: s.quantite });
            }
          }
        }
        alertes.sort((x, y) => x.quantite - y.quantite);
        setAlertesStock(alertes.slice(0, 8));
      }
    } catch (e) {
      setErreur(e.message || "Erreur lors du chargement du tableau de bord.");
    } finally {
      setChargement(false);
    }
  }, [estAdmin, peutVoirVentes, peutVoirStock, user]);

  useEffect(() => { charger(); }, [charger]);

  if (chargement) return <p className="text-sm" style={{ color: COULEUR.texteDoux }}>Chargement…</p>;

  return (
    <div>
      {erreur && <p className="text-sm mb-4 p-3 rounded-lg" style={{ color: "#B04A3B", background: "#FBEAE7" }}>⚠ {erreur}</p>}

      <p className="font-display text-2xl font-semibold mb-6">
        Bonjour {user?.prenom} 👋
      </p>

      {peutVoirVentes && caJour && (
        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="rounded-2xl p-5" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
            <p className="text-xs font-mono uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: COULEUR.accent }}>
              <TrendingUp size={14} /> Chiffre d'affaires du jour
            </p>
            <div className="flex gap-6 items-end flex-wrap">
              {caJour.parBoutique.map((b) => (
                <div key={b.boutique}>
                  <p className="text-xs" style={{ color: COULEUR.texteDoux }}>{b.boutique}</p>
                  <p className="font-display text-lg font-semibold">{fmt(b.totalVentes)} F</p>
                </div>
              ))}
              {caJour.parBoutique.length > 1 && (
                <div>
                  <p className="text-xs" style={{ color: COULEUR.texteDoux }}>Total</p>
                  <p className="font-display text-xl font-semibold" style={{ color: COULEUR.accent }}>{fmt(caJour.cumul.totalVentes)} F</p>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-2xl p-5" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
            <p className="text-xs font-mono uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: COULEUR.accent }}>
              <ShoppingBag size={14} /> Ventes du jour
            </p>
            <p className="font-display text-3xl font-semibold">{caJour.cumul.nombreVentes}</p>
          </div>
        </div>
      )}

      <div className="grid sm:grid-cols-2 gap-4 mb-6">
        {peutVoirStock && (
          <div className="rounded-2xl p-5" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
            <p className="text-xs font-mono uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: "#B04A3B" }}>
              <AlertTriangle size={14} /> Alertes stock faible (≤ {SEUIL_STOCK_FAIBLE})
            </p>
            {alertesStock.length === 0 ? (
              <p className="text-sm" style={{ color: COULEUR.texteDoux }}>Aucune alerte pour l'instant.</p>
            ) : (
              <div className="space-y-2">
                {alertesStock.map((a, i) => (
                  <div key={i} className="flex items-center justify-between text-sm">
                    <span>{a.designation} {a.pointure ? `· T${a.pointure}` : ""} <span className="text-xs" style={{ color: COULEUR.texteDoux }}>({a.boutique})</span></span>
                    <span className="font-mono px-2 py-0.5 rounded-full text-xs" style={{ background: a.quantite === 0 ? "#FBEAE7" : "#FDF3E3", color: a.quantite === 0 ? "#B04A3B" : "#A8823D" }}>
                      {a.quantite}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {peutVoirVentes && credits && (
          <div className="rounded-2xl p-5" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
            <p className="text-xs font-mono uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: COULEUR.accent }}>
              <CreditCard size={14} /> Créances en cours
            </p>
            <p className="font-display text-2xl font-semibold mb-1">{fmt(credits.total)} F</p>
            <p className="text-xs mb-3" style={{ color: COULEUR.texteDoux }}>{credits.nombreClients} client(s) concerné(s)</p>
            {credits.top.length > 0 && (
              <div className="space-y-1.5 pt-3" style={{ borderTop: `1px solid ${COULEUR.bordure}` }}>
                {credits.top.map((v) => (
                  <div key={v.id} className="flex items-center justify-between text-sm">
                    <span>{v.client?.nomPrenoms || "Client"}</span>
                    <span className="font-mono">{fmt(v.resteAPayer)} F</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {estAdmin && anniversaires.length > 0 && (
        <div className="rounded-2xl p-5 mb-6" style={{ background: COULEUR.carte, border: `1px solid ${COULEUR.bordure}` }}>
          <p className="text-xs font-mono uppercase tracking-wide mb-3 flex items-center gap-1.5" style={{ color: COULEUR.accent }}>
            <Cake size={14} /> Anniversaires aujourd'hui
          </p>
          <div className="space-y-1.5">
            {anniversaires.map((c) => (
              <div key={c.id} className="flex items-center justify-between text-sm">
                <span>{c.nomPrenoms}</span>
                <span className="text-xs font-mono" style={{ color: COULEUR.texteDoux }}>{c.jourAnniv} {c.moisAnniv}</span>
              </div>
            ))}
          </div>
        </div>
      )}
     {peutVoirVentes && meilleurVendeur && (
        <div className="rounded-2xl p-5" style={{ background: COULEUR.texte, color: "#FBF3EC" }}>
          <p className="text-xs opacity-80 mb-1 flex items-center gap-1.5"><Award size={14} /> Meilleur vendeur de la semaine</p>
          <p className="font-display text-lg font-semibold">{meilleurVendeur.nom} — {meilleurVendeur.boutique}</p>
          <p className="text-sm opacity-90 mt-1">{fmt(meilleurVendeur.montant)} F sur {meilleurVendeur.nombre} vente(s)</p>
        </div>
      )}
    </div>
  );
}