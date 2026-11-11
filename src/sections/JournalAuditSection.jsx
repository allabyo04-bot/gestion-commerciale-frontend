import { useState, useEffect, useCallback } from "react";
import { ScrollText, Users as UsersIcon, Percent, Truck } from "lucide-react";
import { api } from "../api.js";
import { fmt, FICHES_LIVRAISON_ACTIF } from "../constants.js";
import { ErrorBanner } from "../components/Shared.jsx";

const ACTION_LABELS = {
  PRIX_MODIFIE: "Prix modifié",
  SUPPRESSION: "Suppression",
  CONNEXION: "Connexion",
  PIN_MODIFIE: "PIN modifié",
  ROLE_MODIFIE: "Rôle modifié",
};
const ACTION_COLORS = {
  PRIX_MODIFIE: { fg: "#A8823D", bg: "#FBF3E3" },
  SUPPRESSION: { fg: "#B04A3B", bg: "#FBEAE7" },
  CONNEXION: { fg: "#3F6B4A", bg: "#E9F0EA" },
  PIN_MODIFIE: { fg: "#6B5D52", bg: "#F1E9DC" },
  ROLE_MODIFIE: { fg: "#8C3B2E", bg: "#FBF3EC" },
};

function Onglets({ vue, setVue }) {
  const items = [
    ["JOURNAL", "Journal général", ScrollText],
    ["CLIENTS", "Fiches clients", UsersIcon],
    ["REMISES", "Remises par caissière", Percent],
    ...(FICHES_LIVRAISON_ACTIF ? [["LIVRAISONS", "Livraisons", Truck]] : []),
  ];
  return (
    <div className="flex gap-2 mb-5 flex-wrap">
      {items.map(([id, label, Icon]) => (
        <button key={id} type="button" onClick={() => setVue(id)}
          className="px-4 py-2 rounded-full text-sm font-medium flex items-center gap-1.5"
          style={vue === id ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>
          <Icon size={14} /> {label}
        </button>
      ))}
    </div>
  );
}

function FiltrePeriode({ dateDebut, setDateDebut, dateFin, setDateFin }) {
  return (
    <div className="flex flex-wrap items-end gap-3 mb-4">
      <div>
        <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Du</label>
        <input type="date" value={dateDebut} onChange={(e) => setDateDebut(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm" style={{ border: "1px solid #DDD3C4" }} />
      </div>
      <div>
        <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Au</label>
        <input type="date" value={dateFin} onChange={(e) => setDateFin(e.target.value)}
          className="px-3 py-1.5 rounded-lg text-sm" style={{ border: "1px solid #DDD3C4" }} />
      </div>
    </div>
  );
}

function JournalGeneral() {
  const [entrees, setEntrees] = useState(null);
  const [error, setError] = useState("");
  const [action, setAction] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const load = useCallback(async () => {
    try { setEntrees(await api.journalAudit.list({ action, dateDebut, dateFin })); }
    catch (e) { setError(e.message); }
  }, [action, dateDebut, dateFin]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-3 mb-4">
        <FiltrePeriode dateDebut={dateDebut} setDateDebut={setDateDebut} dateFin={dateFin} setDateFin={setDateFin} />
        <select value={action} onChange={(e) => setAction(e.target.value)}
          className="px-3 py-2 rounded-lg text-sm" style={{ border: "1px solid #DDD3C4" }}>
          <option value="">Toutes les actions</option>
          {Object.entries(ACTION_LABELS).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
        </select>
      </div>
      {error && <ErrorBanner error={error} />}
      {entrees === null ? (
        <p className="text-sm" style={{ color: "#6B5D52" }}>Chargement...</p>
      ) : entrees.length === 0 ? (
        <p className="text-sm" style={{ color: "#6B5D52" }}>Rien à signaler pour cette période.</p>
      ) : (
        <div className="space-y-1.5">
          {entrees.map((e) => {
            const couleur = ACTION_COLORS[e.action] || { fg: "#6B5D52", bg: "#F1E9DC" };
            return (
              <div key={e.id} className="rounded-xl p-3 flex items-start justify-between gap-3 text-sm" style={{ background: "#FFFFFF", border: "1px solid #EAE1D2" }}>
                <div className="min-w-0">
                  <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: couleur.bg, color: couleur.fg }}>
                    {ACTION_LABELS[e.action] || e.action}
                  </span>
                  <span className="ml-2">{e.cible}</span>
                  {e.detail && <span className="ml-1.5" style={{ color: "#6B5D52" }}>— {e.detail}</span>}
                  <div className="text-xs mt-1" style={{ color: "#6B5D52" }}>
                    Par {e.utilisateur?.prenom} {e.utilisateur?.nom}{e.boutique ? ` · ${e.boutique}` : ""}
                  </div>
                </div>
                <span className="text-xs shrink-0 whitespace-nowrap" style={{ color: "#6B5D52" }}>
                  {new Date(e.createdAt).toLocaleString("fr-FR")}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function FichesClients() {
  const [clients, setClients] = useState(null);
  const [error, setError] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");
  const [sansTelephoneUniquement, setSansTelephoneUniquement] = useState(false);

  const load = useCallback(async () => {
    try { setClients(await api.journalAudit.fichesClients({ dateDebut, dateFin })); }
    catch (e) { setError(e.message); }
  }, [dateDebut, dateFin]);
  useEffect(() => { load(); }, [load]);

  const affiches = clients ? clients.filter((c) => !sansTelephoneUniquement || !c.telephone) : [];
  const nbSansTelephone = clients ? clients.filter((c) => !c.telephone).length : 0;

  return (
    <div>
      <FiltrePeriode dateDebut={dateDebut} setDateDebut={setDateDebut} dateFin={dateFin} setDateFin={setDateFin} />
      {(dateDebut || dateFin) && (
        <p className="text-xs mb-3" style={{ color: "#A8823D" }}>
          Les anciennes fiches (créées avant ce suivi, date de création inconnue) sont exclues d'un filtre par période — retire le filtre pour les revoir.
        </p>
      )}
      {error && <ErrorBanner error={error} />}
      {clients === null ? (
        <p className="text-sm" style={{ color: "#6B5D52" }}>Chargement...</p>
      ) : (
        <>
          {nbSansTelephone > 0 && (
            <label className="flex items-center gap-2 text-sm mb-3" style={{ color: "#B04A3B" }}>
              <input type="checkbox" checked={sansTelephoneUniquement} onChange={(e) => setSansTelephoneUniquement(e.target.checked)} />
              N'afficher que les {nbSansTelephone} fiche(s) sans numéro de téléphone (forcément anciennes — le champ est obligatoire depuis)
            </label>
          )}
          {affiches.length === 0 ? (
            <p className="text-sm" style={{ color: "#6B5D52" }}>Aucune fiche pour cette période.</p>
          ) : (
            <div className="space-y-1.5">
              {affiches.map((c) => (
                <div key={c.id} className="rounded-xl p-3 flex items-center justify-between gap-3 text-sm" style={{ background: "#FFFFFF", border: c.telephone ? "1px solid #EAE1D2" : "1px solid #B04A3B" }}>
                  <div>
                    <span className="font-medium">{c.nomPrenoms}</span>
                    <span className="ml-1.5 font-mono text-xs" style={{ color: "#6B5D52" }}>{c.code}</span>
                    {!c.telephone && <span className="ml-2 text-xs px-2 py-0.5 rounded-full" style={{ background: "#FBEAE7", color: "#B04A3B" }}>Sans téléphone</span>}
                    <div className="text-xs mt-1" style={{ color: "#6B5D52" }}>
                      Créée par {c.creePar ? `${c.creePar.prenom} ${c.creePar.nom}` : "inconnu (ancienne fiche, avant ce suivi)"}
                    </div>
                  </div>
                  <span className="text-xs shrink-0 whitespace-nowrap text-right" style={{ color: c.creePar ? "#6B5D52" : "#A8823D" }}>
                    {c.creePar ? new Date(c.createdAt).toLocaleDateString("fr-FR") : "Date inconnue"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function RemisesParCaissiere() {
  const [lignes, setLignes] = useState(null);
  const [error, setError] = useState("");
  const [dateDebut, setDateDebut] = useState("");
  const [dateFin, setDateFin] = useState("");

  const load = useCallback(async () => {
    try { setLignes(await api.journalAudit.remisesParCaissiere({ dateDebut, dateFin })); }
    catch (e) { setError(e.message); }
  }, [dateDebut, dateFin]);
  useEffect(() => { load(); }, [load]);

  return (
    <div>
      <FiltrePeriode dateDebut={dateDebut} setDateDebut={setDateDebut} dateFin={dateFin} setDateFin={setDateFin} />
      {error && <ErrorBanner error={error} />}
      {lignes === null ? (
        <p className="text-sm" style={{ color: "#6B5D52" }}>Chargement...</p>
      ) : lignes.length === 0 ? (
        <p className="text-sm" style={{ color: "#6B5D52" }}>Aucune demande de remise sur cette période.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ minWidth: 600 }}>
            <thead>
              <tr style={{ color: "#6B5D52", borderBottom: "1px solid #EAE1D2" }}>
                <th className="text-left py-2">Caissier(ère)</th>
                <th className="text-right py-2">Demandes</th>
                <th className="text-right py-2">Montant total</th>
                <th className="text-right py-2">Approuvées</th>
                <th className="text-right py-2">Refusées</th>
                <th className="text-right py-2">En attente</th>
              </tr>
            </thead>
            <tbody>
              {lignes.map((l, i) => (
                <tr key={i} style={{ borderTop: "1px solid #EFE7D9" }}>
                  <td className="py-2">{l.caissier.prenom} {l.caissier.nom}</td>
                  <td className="text-right py-2">{l.nombre}</td>
                  <td className="text-right py-2 font-mono">{fmt(l.montantTotal)} F</td>
                  <td className="text-right py-2" style={{ color: "#3F6B4A" }}>{l.approuvees}</td>
                  <td className="text-right py-2" style={{ color: "#B04A3B" }}>{l.refusees}</td>
                  <td className="text-right py-2" style={{ color: "#A8823D" }}>{l.enAttente}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// Contrôle des livraisons : une livraison = une cliente. Combien sont saisies sans fiche cliente, combien
// contiennent beaucoup de paires (signe possible de regroupement), par boutique et par personne.
function ControleLivraisons() {
  const jourIso = (d) => d.toISOString().slice(0, 10);
  const [dateDebut, setDateDebut] = useState(jourIso(new Date(Date.now() - 30 * 86400000)));
  const [dateFin, setDateFin] = useState(jourIso(new Date()));
  const [saisieSeuil, setSaisieSeuil] = useState("4");
  const [seuil, setSeuil] = useState(4);
  const [donnees, setDonnees] = useState(null);
  const [error, setError] = useState("");

  // Le seuil s'applique dès que la saisie est valide, sans devoir valider
  useEffect(() => {
    const v = parseInt(saisieSeuil, 10);
    if (!(v >= 1 && v <= 50) || v === seuil) return undefined;
    const t = setTimeout(() => setSeuil(v), 400);
    return () => clearTimeout(t);
  }, [saisieSeuil, seuil]);

  const load = useCallback(async () => {
    try { setError(""); setDonnees(await api.controleLivraisons({ dateDebut, dateFin, seuil: String(seuil) })); }
    catch (e) { setError(e.message); }
  }, [dateDebut, dateFin, seuil]);
  useEffect(() => { load(); }, [load]);

  const dateCourte = (d) => new Date(d).toLocaleDateString("fr-FR");
  const carte = (titre, valeur, detail, alerte) => (
    <div className="rounded-xl p-4" style={{ background: "#FFFFFF", border: `1px solid ${alerte ? "#E3B9B0" : "#EAE1D2"}` }}>
      <p className="text-xs mb-1" style={{ color: "#6B5D52" }}>{titre}</p>
      <p className="font-display text-2xl font-semibold" style={{ color: alerte ? "#B04A3B" : "#2B2320" }}>{valeur}</p>
      {detail && <p className="text-xs mt-1" style={{ color: "#6B5D52" }}>{detail}</p>}
    </div>
  );
  const tableau = (titre, lignes, cle, libelle) => (
    <div className="mb-6">
      <p className="text-sm font-medium mb-2">{titre}</p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm" style={{ minWidth: 560 }}>
          <thead>
            <tr style={{ color: "#6B5D52", borderBottom: "1px solid #EAE1D2" }}>
              <th className="text-left py-2">{libelle}</th>
              <th className="text-right py-2">Livraisons</th>
              <th className="text-right py-2">Sans fiche cliente</th>
              <th className="text-right py-2">Plus de {donnees.seuil} paires</th>
              <th className="text-right py-2">Paires</th>
            </tr>
          </thead>
          <tbody>
            {lignes.map((l) => (
              <tr key={cle(l)} style={{ borderTop: "1px solid #EFE7D9" }}>
                <td className="py-2">{libelle === "Personne" ? `${l.nom} (${l.boutique})` : l.boutique}</td>
                <td className="text-right py-2">{l.nbBons}</td>
                <td className="text-right py-2" style={{ color: l.nbSansFiche ? "#B04A3B" : "#3F6B4A" }}>{l.nbSansFiche} ({l.pctSansFiche} %)</td>
                <td className="text-right py-2" style={{ color: l.nbGrosBons ? "#A8823D" : "#6B5D52" }}>{l.nbGrosBons}</td>
                <td className="text-right py-2">{l.nbPaires}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  return (
    <div>
      <p className="text-sm mb-4" style={{ color: "#6B5D52" }}>
        Une livraison = une cliente. Voici combien de livraisons sont enregistrées sans fiche cliente, et combien contiennent beaucoup de paires (signe possible de regroupement de plusieurs clientes sur un seul bon).
      </p>
      <div className="flex flex-wrap items-end gap-3 mb-4">
        <FiltrePeriode dateDebut={dateDebut} setDateDebut={setDateDebut} dateFin={dateFin} setDateFin={setDateFin} />
        <div className="mb-4">
          <label className="block text-xs mb-1" style={{ color: "#6B5D52" }}>Gros bon = plus de (paires)</label>
          <input type="number" min="1" max="50" value={saisieSeuil} onChange={(e) => setSaisieSeuil(e.target.value)}
            onBlur={() => { const v = parseInt(saisieSeuil, 10); if (!(v >= 1 && v <= 50)) setSaisieSeuil(String(seuil)); }}
            className="px-3 py-1.5 rounded-lg text-sm" style={{ border: "1px solid #DDD3C4", width: 110 }} />
        </div>
      </div>
      {error && <ErrorBanner error={error} />}
      {donnees === null ? (
        <p className="text-sm" style={{ color: "#6B5D52" }}>Chargement...</p>
      ) : donnees.total.nbBons === 0 ? (
        <p className="text-sm" style={{ color: "#6B5D52" }}>Aucune livraison sur cette période.</p>
      ) : (
        <>
          <div className="grid sm:grid-cols-3 gap-3 mb-5">
            {carte("Livraisons enregistrées", donnees.total.nbBons, `${donnees.total.nbPaires} paires au total`)}
            {carte("Sans fiche cliente", `${donnees.total.nbSansFiche} (${donnees.total.pctSansFiche} %)`, "Le numéro n'est pas rattaché à une fiche", donnees.total.nbSansFiche > 0)}
            {carte(`Plus de ${donnees.seuil} paires`, donnees.total.nbGrosBons, "À vérifier : regroupement possible", donnees.total.nbGrosBons > 0)}
          </div>
          <p className="text-xs mb-5" style={{ color: "#6B5D52" }}>
            Les livraisons enregistrées avant l'activation de la fiche automatique n'ont pas de fiche cliente : sur une période passée, ces chiffres reflètent l'ancien fonctionnement.
          </p>
          {tableau("Par boutique", donnees.parBoutique, (l) => l.boutique, "Boutique")}
          {tableau("Par personne qui a enregistré", donnees.parPersonne, (l) => `${l.nom}|${l.boutique}`, "Personne")}
          {donnees.grosBons.length > 0 && (
            <div>
              <p className="text-sm font-medium mb-2">Livraisons de plus de {donnees.seuil} paires {donnees.grosBons.length === 100 ? "(100 premières)" : ""}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm" style={{ minWidth: 640 }}>
                  <thead>
                    <tr style={{ color: "#6B5D52", borderBottom: "1px solid #EAE1D2" }}>
                      <th className="text-left py-2">Bon</th><th className="text-left py-2">Date</th><th className="text-left py-2">Boutique</th>
                      <th className="text-left py-2">Enregistré par</th><th className="text-left py-2">Cliente</th>
                      <th className="text-right py-2">Paires</th><th className="text-right py-2">Fiche</th>
                    </tr>
                  </thead>
                  <tbody>
                    {donnees.grosBons.map((b) => (
                      <tr key={b.numero} style={{ borderTop: "1px solid #EFE7D9" }}>
                        <td className="py-2 font-mono">{b.numero}</td>
                        <td className="py-2">{dateCourte(b.dateCreation)}</td>
                        <td className="py-2">{b.boutique}</td>
                        <td className="py-2">{b.creePar}</td>
                        <td className="py-2">{b.clientNom}</td>
                        <td className="text-right py-2 font-medium">{b.nbPaires}</td>
                        <td className="text-right py-2" style={{ color: b.avecFiche ? "#3F6B4A" : "#B04A3B" }}>{b.avecFiche ? "Oui" : "Non"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default function JournalAuditSection() {
  const [vue, setVue] = useState("JOURNAL");

  return (
    <div>
      <h1 className="font-display text-2xl font-semibold mb-1">Journal d'audit</h1>
      <p className="text-sm mb-5" style={{ color: "#6B5D52" }}>
        Réservé à l'administrateur — pour repérer des tendances (pas pour un usage quotidien des caissières).
      </p>
      <Onglets vue={vue} setVue={setVue} />
      {vue === "JOURNAL" && <JournalGeneral />}
      {vue === "CLIENTS" && <FichesClients />}
      {vue === "REMISES" && <RemisesParCaissiere />}
      {vue === "LIVRAISONS" && FICHES_LIVRAISON_ACTIF && <ControleLivraisons />}
    </div>
  );
}
