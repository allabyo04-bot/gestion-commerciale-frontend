// Toutes les requêtes vers le backend passent par ici.
// L'URL du backend se configure via une variable d'environnement au moment du build
// (VITE_API_URL) — voir le .env.example du frontend.
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:4000";

function getToken() {
  return localStorage.getItem("gc_token");
}

export function setToken(token) {
  if (token) localStorage.setItem("gc_token", token);
  else localStorage.removeItem("gc_token");
}

async function request(path, { method = "GET", body } = {}) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  if (res.status === 204) return null;

  let data;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const message = data?.error || `Erreur ${res.status}`;
    const error = new Error(message);
    error.status = res.status;
    throw error;
  }
  return data;
}

// Récupère un fichier protégé (pièce jointe) avec le jeton de connexion et le rend sous forme de Blob.
export async function recupererFichier(path) {
  const token = getToken();
  const res = await fetch(`${API_URL}${path}`, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  if (!res.ok) throw new Error(`Erreur ${res.status}`);
  return res.blob();
}

export const api = {
  obligations: {
    types: () => request("/api/obligations/types"),
    creerType: (nom) => request("/api/obligations/types", { method: "POST", body: { nom } }),
    modifierType: (code, body) => request(`/api/obligations/types/${code}`, { method: "PUT", body }),
    supprimerType: (code) => request(`/api/obligations/types/${code}`, { method: "DELETE" }),
    resume: () => request("/api/obligations/resume"),
    list: (statut = "OUVERTES") => request(`/api/obligations?statut=${statut}`),
    create: (o) => request("/api/obligations", { method: "POST", body: o }),
    update: (id, o) => request(`/api/obligations/${id}`, { method: "PUT", body: o }),
    regler: (id, body = {}) => request(`/api/obligations/${id}/regler`, { method: "POST", body }),
    remove: (id) => request(`/api/obligations/${id}`, { method: "DELETE" }),
    ajouterPiece: (id, piece) => request(`/api/obligations/${id}/pieces`, { method: "POST", body: piece }),
    supprimerPiece: (pieceId) => request(`/api/obligations/pieces/${pieceId}`, { method: "DELETE" }),
  },
  auth: {
    login: (login, pin) => request("/api/auth/login", { method: "POST", body: { login, pin } }),
    me: () => request("/api/auth/me"),
    questionSecrete: (login) => request(`/api/auth/question-secrete/${encodeURIComponent(login)}`),
    reinitialiserPin: (data) => request("/api/auth/reinitialiser-pin", { method: "POST", body: data }),
  },
  users: {
    list: () => request("/api/users"),
    create: (data) => request("/api/users", { method: "POST", body: data }),
    update: (id, data) => request(`/api/users/${id}`, { method: "PUT", body: data }),
    remove: (id, codeConfirmation) => request(`/api/users/${id}`, { method: "DELETE", body: { codeConfirmation } }),
  },
  roles: {
    list: () => request("/api/roles"),
    create: (data) => request("/api/roles", { method: "POST", body: data }),
    update: (id, data) => request(`/api/roles/${id}`, { method: "PUT", body: data }),
    remove: (id, codeConfirmation) => request(`/api/roles/${id}`, { method: "DELETE", body: { codeConfirmation } }),
  },
  securite: {
    changerCode: (codeActuel, nouveauCode) => request("/api/securite/changer-code", { method: "POST", body: { codeActuel, nouveauCode } }),
  },
  analyses: {
    pointuresParMarque: (params = {}) => request(`/api/analyses/pointures-par-marque?${new URLSearchParams(params)}`),
    meilleursMois: (params = {}) => request(`/api/analyses/meilleurs-mois?${new URLSearchParams(params)}`),
    habitudesClientes: (params = {}) => request(`/api/analyses/habitudes-clientes?${new URLSearchParams(params)}`),
  },
  etatsClientes: {
    fichesIncompletes: (params = {}) => request(`/api/etats-clientes/fiches-incompletes?${new URLSearchParams(params)}`),
    bonus: (params = {}) => request(`/api/etats-clientes/bonus?${new URLSearchParams(params)}`),
    nouvellesClientes: (params = {}) => request(`/api/etats-clientes/nouvelles-clientes?${new URLSearchParams(params)}`),
  },
  rh: {
    employes: () => request("/api/rh/employes"),
    utilisateurs: () => request("/api/rh/utilisateurs"),
    creerEmploye: (d) => request("/api/rh/employes", { method: "POST", body: d }),
    modifierEmploye: (id, d) => request(`/api/rh/employes/${id}`, { method: "PUT", body: d }),
    demandes: (statut) => request(`/api/rh/demandes${statut ? `?statut=${statut}` : ""}`),
    resumeDemandes: () => request("/api/rh/demandes/resume"),
    decider: (id, d) => request(`/api/rh/demandes/${id}/decider`, { method: "PUT", body: d }),
    prets: () => request("/api/rh/prets"),
    mesDemandes: () => request("/api/rh/mes-demandes"),
    creerMaDemande: (d) => request("/api/rh/mes-demandes", { method: "POST", body: d }),
    retirerMaDemande: (id) => request(`/api/rh/mes-demandes/${id}`, { method: "DELETE" }),
    evenements: (employeId) => request(`/api/rh/evenements${employeId ? `?employeId=${employeId}` : ""}`),
    creerEvenement: (d) => request("/api/rh/evenements", { method: "POST", body: d }),
    supprimerEvenement: (id) => request(`/api/rh/evenements/${id}`, { method: "DELETE" }),
    pointages: (mois) => request(`/api/rh/pointages?mois=${mois}`),
    pointer: (d) => request("/api/rh/pointages", { method: "PUT", body: d }),
    supprimerPointage: (id) => request(`/api/rh/pointages/${id}`, { method: "DELETE" }),
    reunions: () => request("/api/rh/reunions"),
    creerReunion: (d) => request("/api/rh/reunions", { method: "POST", body: d }),
    supprimerReunion: (id) => request(`/api/rh/reunions/${id}`, { method: "DELETE" }),
    anniversaires: () => request("/api/rh/anniversaires"),
  },
  paie: {
    parametres: () => request("/api/paie/parametres"),
    enregistrerParametres: (parametres) => request("/api/paie/parametres", { method: "PUT", body: { parametres } }),
    calculer: (mois) => request("/api/paie/bulletins/calculer", { method: "POST", body: { mois } }),
    bulletins: (mois) => request(`/api/paie/bulletins?mois=${mois}`),
    bulletin: (id) => request(`/api/paie/bulletins/${id}`),
    valider: (id) => request(`/api/paie/bulletins/${id}/valider`, { method: "POST", body: {} }),
    rouvrir: (id) => request(`/api/paie/bulletins/${id}/rouvrir`, { method: "POST", body: {} }),
    supprimer: (id) => request(`/api/paie/bulletins/${id}`, { method: "DELETE" }),
  },
  publics: {
    echelles: () => request("/api/publics/echelles"),
    enregistrerEchelle: (publicCible, valeurs) => request("/api/publics/echelles", { method: "PUT", body: { publicCible, valeurs } }),
  },
  fraisExpedition: {
    liste: (statut) => request(`/api/frais-expedition${statut ? `?statut=${statut}` : ""}`),
    modifier: (id, data) => request(`/api/frais-expedition/${id}`, { method: "PUT", body: data }),
    reel: (id, coutReel, livreurId) => request(`/api/frais-expedition/${id}/reel`, { method: "PUT", body: { coutReel, livreurId } }),
    rembourser: (id) => request(`/api/frais-expedition/${id}/rembourser`, { method: "POST", body: {} }),
  },
  remisesLivreurs: {
    liste: (params = {}) => request(`/api/remises-livreurs?${new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()}`),
    aPayer: () => request("/api/remises-livreurs/a-payer"),
    comptes: () => request("/api/remises-livreurs/comptes"),
    fraisARembourser: (livreurId) => request(`/api/remises-livreurs/frais-a-rembourser?livreurId=${livreurId || ""}`),
    lire: (id) => request(`/api/remises-livreurs/${id}`),
    creer: (data) => request("/api/remises-livreurs", { method: "POST", body: data }),
    modifier: (id, data) => request(`/api/remises-livreurs/${id}`, { method: "PUT", body: data }),
    supprimer: (id) => request(`/api/remises-livreurs/${id}`, { method: "DELETE" }),
    ajouterBon: (id, data) => request(`/api/remises-livreurs/${id}/bons`, { method: "POST", body: data }),
    preuve: (bonId) => request(`/api/remises-livreurs/bons/${bonId}/preuve`),
    statutBon: (bonId, statut, motifRefus) => request(`/api/remises-livreurs/bons/${bonId}/statut`, { method: "PUT", body: { statut, motifRefus } }),
    supprimerBon: (bonId) => request(`/api/remises-livreurs/bons/${bonId}`, { method: "DELETE" }),
    valider: (id) => request(`/api/remises-livreurs/${id}/valider`, { method: "POST", body: {} }),
    payer: (id, montant) => request(`/api/remises-livreurs/${id}/payer`, { method: "POST", body: montant ? { montant } : {} }),
    rouvrir: (id) => request(`/api/remises-livreurs/${id}/rouvrir`, { method: "POST", body: {} }),
    suggestion: (id) => request(`/api/remises-livreurs/${id}/remuneration-suggeree`),
    appliquerRemuneration: (id) => request(`/api/remises-livreurs/${id}/appliquer-remuneration`, { method: "POST", body: {} }),
  },
  tarifsLivreur: {
    lire: () => request("/api/tarifs-livreur"),
    regler: (type, cle, montant) => request("/api/tarifs-livreur", { method: "PUT", body: { type, cle, montant } }),
    estimation: (zone, paires) => request(`/api/tarifs-livreur/estimation?zone=${encodeURIComponent(zone)}&paires=${paires}`),
  },
  bonsAchat: {
    liste: () => request("/api/bons-achat"),
    lire: (id) => request(`/api/bons-achat/${id}`),
    creer: (data) => request("/api/bons-achat", { method: "POST", body: data }),
    modifier: (id, data) => request(`/api/bons-achat/${id}`, { method: "PUT", body: data }),
    supprimer: (id) => request(`/api/bons-achat/${id}`, { method: "DELETE" }),
  },
  valeurStock: (params = {}) => request(`/api/etats/valeur-stock?${new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString()}`),
  prixAchatEuro: (articleId, prixAchatEuro) => request(`/api/articles/${articleId}/prix-achat-euro`, { method: "PUT", body: { prixAchatEuro } }),
  whatsapp: { etat: () => request("/api/whatsapp/etat") },
  rappels: {
    apercu: () => request("/api/rappels/apercu"),
    envoyer: () => request("/api/rappels/envoyer", { method: "POST", body: {} }),
  },
  fonctions: {
    lire: () => request("/api/fonctions"),
    regler: (code, actif) => request(`/api/fonctions/${code}`, { method: "PUT", body: { actif } }),
  },
  referentiels: {
    lieux: () => request("/api/referentiels/lieux"),
    quartiers: (commune) => request(`/api/referentiels/quartiers?commune=${encodeURIComponent(commune || "")}`),
    villesExpedition: () => request("/api/referentiels/villes-expedition"),
    clientParTelephone: (tel) => request(`/api/referentiels/client-par-telephone?tel=${encodeURIComponent(tel || "")}`),
    livreurs: () => request("/api/referentiels/livreurs"),
    creerLivreur: (nom) => request("/api/referentiels/livreurs", { method: "POST", body: { nom } }),
    modifierLivreur: (id, data) => request(`/api/referentiels/livreurs/${id}`, { method: "PATCH", body: data }),
    fusionnerLivreurs: (sourceId, cibleId) => request("/api/referentiels/livreurs/fusion", { method: "POST", body: { sourceId, cibleId } }),
    ajouterLieu: (type, nom) => request("/api/referentiels/lieux", { method: "POST", body: { type, nom } }),
    modifierLieu: (id, actif) => request(`/api/referentiels/lieux/${id}`, { method: "PATCH", body: { actif } }),
    simulerClassement: () => request("/api/referentiels/classement-anciennes-livraisons"),
    appliquerClassement: () => request("/api/referentiels/classement-anciennes-livraisons", { method: "POST" }),
    statistiques: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return request(`/api/referentiels/statistiques${qs ? `?${qs}` : ""}`);
    },
  },
  corrigerInversionsLivraisons: () => request(`/api/controle-livraisons/corriger-inversions`, { method: "POST" }),
  controleLivraisons: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/api/controle-livraisons${qs ? `?${qs}` : ""}`);
  },
  suiviClientes: {
    aRemercier: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return request(`/api/suivi-clientes/a-remercier${qs ? `?${qs}` : ""}`);
    },
    aRelancer: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return request(`/api/suivi-clientes/a-relancer${qs ? `?${qs}` : ""}`);
    },
    bonusAAppeler: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return request(`/api/suivi-clientes/bonus-a-appeler${qs ? `?${qs}` : ""}`);
    },
    marquerMessage: (clientId, type) => request("/api/suivi-clientes/messages", { method: "POST", body: { clientId, type } }),
    annulerMessage: (id) => request(`/api/suivi-clientes/messages/${id}`, { method: "DELETE" }),
    pairesParMarque: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return request(`/api/suivi-clientes/paires-par-marque${qs ? `?${qs}` : ""}`);
    },
  },
  fidelite: {
    client: (id) => request(`/api/fidelite/client/${id}`),
    clientsBonusDisponible: () => request("/api/fidelite/clients-bonus-disponible"),
    bonusAccordes: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return request(`/api/fidelite/bonus-accordes${qs ? `?${qs}` : ""}`);
    },
    clientsParStatut: (statut) => request(`/api/fidelite/clients-par-statut${statut ? `?statut=${encodeURIComponent(statut)}` : ""}`),
    paliersBonus: () => request("/api/fidelite/paliers-bonus"),
    creerPalierBonus: (data) => request("/api/fidelite/paliers-bonus", { method: "POST", body: data }),
    majPalierBonus: (id, data) => request(`/api/fidelite/paliers-bonus/${id}`, { method: "PUT", body: data }),
    supprimerPalierBonus: (id) => request(`/api/fidelite/paliers-bonus/${id}`, { method: "DELETE" }),
    paliersStatut: () => request("/api/fidelite/paliers-statut"),
    creerPalierStatut: (data) => request("/api/fidelite/paliers-statut", { method: "POST", body: data }),
    majPalierStatut: (id, data) => request(`/api/fidelite/paliers-statut/${id}`, { method: "PUT", body: data }),
    supprimerPalierStatut: (id) => request(`/api/fidelite/paliers-statut/${id}`, { method: "DELETE" }),
    changementsStatut: (tous) => request(`/api/fidelite/changements-statut${tous ? "?tous=1" : ""}`),
    marquerChangementStatutVu: (id) => request(`/api/fidelite/changements-statut/${id}/vu`, { method: "PUT" }),
  },
  journalAudit: {
    list: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return request(`/api/journal-audit${qs ? `?${qs}` : ""}`);
    },
    fichesClients: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return request(`/api/journal-audit/fiches-clients${qs ? `?${qs}` : ""}`);
    },
    remisesParCaissiere: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return request(`/api/journal-audit/remises-par-caissiere${qs ? `?${qs}` : ""}`);
    },
    remisesParMois: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return request(`/api/journal-audit/remises-par-mois${qs ? `?${qs}` : ""}`);
    },
  },
  apiPublique: {
    listerCles: () => request("/api/api-publique/cles"),
    creerCle: (nom, codeConfirmation) => request("/api/api-publique/cles", { method: "POST", body: { nom, codeConfirmation } }),
    toggleCle: (id, actif) => request(`/api/api-publique/cles/${id}`, { method: "PUT", body: { actif } }),
  },
  brands: {
    list: () => request("/api/brands"),
    create: (nom) => request("/api/brands", { method: "POST", body: { nom } }),
    remove: (id) => request(`/api/brands/${id}`, { method: "DELETE" }),
  },
  articles: {
    list: () => request("/api/articles"),
    create: (data) => request("/api/articles", { method: "POST", body: data }),
    update: (id, data) => request(`/api/articles/${id}`, { method: "PUT", body: data }),
    remove: (id) => request(`/api/articles/${id}`, { method: "DELETE" }),
    desactiverTous: () => request("/api/articles/desactiver-tous", { method: "PUT" }),
historiqueMouvements: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/articles/mouvements/historique${qs ? `?${qs}` : ""}`);
    },
    updateStock: (id, boutique, pointure, quantite) =>
      request(`/api/articles/${id}/stock`, { method: "PUT", body: { boutique, pointure, quantite } }),
ajouterStock: (id, boutique, pointure, quantite) =>
      request(`/api/articles/${id}/stock/ajouter`, { method: "POST", body: { boutique, pointure, quantite } }),
    virementStock: (id, boutiqueSource, boutiqueDestination, pointure, quantite) =>
      request(`/api/articles/${id}/stock/virement`, { method: "POST", body: { boutiqueSource, boutiqueDestination, pointure, quantite } }),
    parametresStock: () => request("/api/articles/parametres-stock"),
    majParametresStock: (seuilFixe, seuilPourcentage) =>
      request("/api/articles/parametres-stock", { method: "PUT", body: { seuilFixe, seuilPourcentage } }),
    importApercu: async (formData) => {
      const token = localStorage.getItem("gc_token");
      const res = await fetch(`${API_URL}/api/articles/import/apercu`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      let data;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok) { const err = new Error(data?.error || `Erreur ${res.status}`); err.status = res.status; throw err; }
      return data;
    },
    importConfirmer: (data) => request("/api/articles/import/confirmer", { method: "POST", body: data }),
  },
  inventaire: {
    // Télécharge la feuille de comptage Excel et déclenche le téléchargement dans le navigateur.
    export: async ({ boutique, marqueId, famille }) => {
      const token = localStorage.getItem("gc_token");
      const qs = new URLSearchParams({ boutique, ...(marqueId ? { marqueId } : {}), ...(famille ? { famille } : {}) }).toString();
      const res = await fetch(`${API_URL}/api/inventaire/export?${qs}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      if (!res.ok) {
        let data; try { data = await res.json(); } catch { data = null; }
        const err = new Error(data?.error || `Erreur ${res.status}`); err.status = res.status; throw err;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const match = cd.match(/filename="?([^"]+)"?/);
      const nomFichier = match ? match[1] : "inventaire.xlsx";
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url; a.download = nomFichier; document.body.appendChild(a); a.click();
      a.remove(); window.URL.revokeObjectURL(url);
    },
    apercu: async (formData) => {
      const token = localStorage.getItem("gc_token");
      const res = await fetch(`${API_URL}/api/inventaire/apercu`, {
        method: "POST",
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData,
      });
      let data;
      try { data = await res.json(); } catch { data = null; }
      if (!res.ok) { const err = new Error(data?.error || `Erreur ${res.status}`); err.status = res.status; throw err; }
      return data;
    },
    confirmer: (data) => request("/api/inventaire/confirmer", { method: "POST", body: data }),
  },
  denominationsCartesCadeaux: {
    lister: (tous) => request(`/api/denominations-cartes-cadeaux${tous ? "?tous=1" : ""}`),
    creer: (montant) => request("/api/denominations-cartes-cadeaux", { method: "POST", body: { montant } }),
    activer: (id, actif) => request(`/api/denominations-cartes-cadeaux/${id}`, { method: "PUT", body: { actif } }),
    supprimer: (id) => request(`/api/denominations-cartes-cadeaux/${id}`, { method: "DELETE" }),
    stockerNumeros: (id, boutique, numeros) => request(`/api/denominations-cartes-cadeaux/${id}/stocker-numeros`, { method: "POST", body: { boutique, numeros } }),
    verifierCarte: (numero, boutique) => request(`/api/denominations-cartes-cadeaux/verifier/${encodeURIComponent(numero)}${boutique ? `?boutique=${encodeURIComponent(boutique)}` : ""}`),
    resume: () => request("/api/denominations-cartes-cadeaux/resume"),
  },
  receptions: {
    lister: (boutique) => request(`/api/receptions${boutique ? `?boutique=${encodeURIComponent(boutique)}` : ""}`),
    creer: (data) => request("/api/receptions", { method: "POST", body: data }),
  },
  bonsLivraison: {
    lister: ({ statut, boutique, dateDebut, dateFin } = {}) => {
      const qs = new URLSearchParams({ ...(statut ? { statut } : {}), ...(boutique ? { boutique } : {}), ...(dateDebut ? { dateDebut } : {}), ...(dateFin ? { dateFin } : {}) }).toString();
      return request(`/api/bons-livraison${qs ? `?${qs}` : ""}`);
    },
    get: (id) => request(`/api/bons-livraison/${id}`),
    creer: (data) => request("/api/bons-livraison", { method: "POST", body: data }),
    cloturer: (id, data) => request(`/api/bons-livraison/${id}/cloturer`, { method: "POST", body: data }),
    annuler: (id) => request(`/api/bons-livraison/${id}/annuler`, { method: "POST" }),
  },
  soldes: {
    listerArticles: ({ marqueId, famille } = {}) => {
      const qs = new URLSearchParams({ ...(marqueId ? { marqueId } : {}), ...(famille ? { famille } : {}) }).toString();
      return request(`/api/soldes/articles${qs ? `?${qs}` : ""}`);
    },
    lister: () => request("/api/soldes"),
    creer: (data) => request("/api/soldes", { method: "POST", body: data }),
    terminer: (id) => request(`/api/soldes/${id}/terminer`, { method: "POST" }),
  },
  clients: {
    list: () => request("/api/clients"),
    create: (data) => request("/api/clients", { method: "POST", body: data }),
    update: (id, data) => request(`/api/clients/${id}`, { method: "PUT", body: data }),
    remove: (id) => request(`/api/clients/${id}`, { method: "DELETE" }),
    rechercheParCarte: (carte) => request(`/api/clients/recherche?carte=${encodeURIComponent(carte)}`),
    rechercheMulti: (q) => request(`/api/clients/recherche-multi?q=${encodeURIComponent(q)}`),
    historiqueAchats: (id) => request(`/api/clients/${id}/historique-achats`),
  },
  ventes: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/ventes${qs ? `?${qs}` : ""}`);
    },
    create: (data) => request("/api/ventes", { method: "POST", body: data }),
    rechercheParNumero: (numero) => request(`/api/ventes/recherche/${encodeURIComponent(numero)}`),
creditListe: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/ventes/credit/liste${qs ? `?${qs}` : ""}`);
    },
    reglement: (id, data) => request(`/api/ventes/${id}/reglement`, { method: "POST", body: data }),
    annuler: (id, data) => request(`/api/ventes/${id}/annuler`, { method: "POST", body: data }),
  },
  ventesAttente: {
    list: (boutique) => request(`/api/ventes-attente${boutique ? `?boutique=${encodeURIComponent(boutique)}` : ""}`),
    create: (data) => request("/api/ventes-attente", { method: "POST", body: data }),
    remove: (id) => request(`/api/ventes-attente/${id}`, { method: "DELETE" }),
  },
  bonsValeur: {
    list: (type) => request(`/api/bons-valeur${type ? `?type=${encodeURIComponent(type)}` : ""}`),
    create: (data) => request("/api/bons-valeur", { method: "POST", body: data }),
    verifier: (numero) => request(`/api/bons-valeur/${encodeURIComponent(numero)}/verifier`),
    marquerHistorique: (id) => request(`/api/bons-valeur/${id}/marquer-historique`, { method: "PUT" }),
    remove: (id) => request(`/api/bons-valeur/${id}`, { method: "DELETE" }),
    echeancesProches: (jours) => request(`/api/bons-valeur/echeances-proches${jours ? `?jours=${jours}` : ""}`),
    marquerRappel: (id, effectue) => request(`/api/bons-valeur/${id}/rappel`, { method: "PUT", body: { effectue } }),
  },
 retours: {
    list: (boutique) => request(`/api/retours${boutique ? `?boutique=${encodeURIComponent(boutique)}` : ""}`),
    create: (data) => request("/api/retours", { method: "POST", body: data }),
  },
vendeurs: {
    list: (boutique) => request(`/api/vendeurs${boutique ? `?boutique=${encodeURIComponent(boutique)}` : ""}`),
    create: (data) => request("/api/vendeurs", { method: "POST", body: data }),
    update: (id, data) => request(`/api/vendeurs/${id}`, { method: "PATCH", body: data }),
  },
remises: {
    create: (data) => request("/api/remises", { method: "POST", body: data }),
    get: (id) => request(`/api/remises/${id}`),
    list: (statut) => request(`/api/remises${statut ? `?statut=${encodeURIComponent(statut)}` : ""}`),
    traiter: (id, statut) => request(`/api/remises/${id}`, { method: "PATCH", body: { statut } }),
  },
depenses: {
    categories: {
      list: (params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/api/depenses/categories${qs ? `?${qs}` : ""}`);
      },
      create: (nom) => request("/api/depenses/categories", { method: "POST", body: { nom } }),
      update: (id, data) => request(`/api/depenses/categories/${id}`, { method: "PUT", body: data }),
      remove: (id) => request(`/api/depenses/categories/${id}`, { method: "DELETE" }),
    },
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/depenses${qs ? `?${qs}` : ""}`);
    },
    create: (data) => request("/api/depenses", { method: "POST", body: data }),
    budget: {
      get: (annee, params = {}) => {
        const qs = new URLSearchParams(params).toString();
        return request(`/api/depenses/budget/${annee}${qs ? `?${qs}` : ""}`);
      },
      set: (data) => request("/api/depenses/budget", { method: "POST", body: data }),
    },
  },
caracteristiques: {
    list: () => request("/api/caracteristiques"),
    articles: () => request("/api/caracteristiques/articles"),
    creer: (data) => request("/api/caracteristiques", { method: "POST", body: data }),
    modifier: (id, data) => request(`/api/caracteristiques/${id}`, { method: "PUT", body: data }),
    supprimer: (id) => request(`/api/caracteristiques/${id}`, { method: "DELETE" }),
    ajouterValeur: (id, valeur) => request(`/api/caracteristiques/${id}/valeurs`, { method: "POST", body: { valeur } }),
    modifierValeur: (id, data) => request(`/api/caracteristiques/valeurs/${id}`, { method: "PUT", body: data }),
    supprimerValeur: (id) => request(`/api/caracteristiques/valeurs/${id}`, { method: "DELETE" }),
    setArticle: (articleId, valeurs) => request(`/api/caracteristiques/article/${articleId}`, { method: "PUT", body: { valeurs } }),
  },
fournisseurs: {
    list: () => request("/api/fournisseurs"),
    creer: (data) => request("/api/fournisseurs", { method: "POST", body: data }),
    modifier: (id, data) => request(`/api/fournisseurs/${id}`, { method: "PUT", body: data }),
    supprimer: (id) => request(`/api/fournisseurs/${id}`, { method: "DELETE" }),
    commandes: (params = {}) => request(`/api/fournisseurs/commandes?${new URLSearchParams(params).toString()}`),
    creerCommande: (data) => request("/api/fournisseurs/commandes", { method: "POST", body: data }),
    supprimerCommande: (id) => request(`/api/fournisseurs/commandes/${id}`, { method: "DELETE" }),
    ajouterLigne: (commandeId, type, data) => request(`/api/fournisseurs/commandes/${commandeId}/${type}`, { method: "POST", body: data }),
    supprimerLigne: (type, id) => request(`/api/fournisseurs/${type}/${id}`, { method: "DELETE" }),
    alertes: () => request("/api/fournisseurs/alertes"),
    synthese: (params = {}) => request(`/api/fournisseurs/synthese?${new URLSearchParams(params).toString()}`),
    tresorerie: (mois = 3) => request(`/api/fournisseurs/tresorerie?mois=${mois}`),
    definirSolde: (data) => request("/api/fournisseurs/tresorerie/solde", { method: "PUT", body: data }),
  },
budgetComplet: {
    sousCategories: {
      list: () => request("/api/budget-complet/sous-categories"),
      create: (data) => request("/api/budget-complet/sous-categories", { method: "POST", body: data }),
      update: (id, data) => request(`/api/budget-complet/sous-categories/${id}`, { method: "PUT", body: data }),
      remove: (id) => request(`/api/budget-complet/sous-categories/${id}`, { method: "DELETE" }),
    },
    postes: {
      list: (annee) => request(`/api/budget-complet/postes?annee=${annee}`),
      set: (data) => request("/api/budget-complet/postes", { method: "PUT", body: data }),
    },
    objectifs: {
      list: (annee) => request(`/api/budget-complet/objectifs?annee=${annee}`),
      set: (data) => request("/api/budget-complet/objectifs", { method: "PUT", body: data }),
    },
    etat: (params) => request(`/api/budget-complet/etat?${new URLSearchParams(params).toString()}`),
    objectifMois: () => request("/api/budget-complet/objectif-mois"),
    objectifAffichage: () => request("/api/budget-complet/objectif-affichage"),
    reglerObjectifAffichage: (mode) => request("/api/budget-complet/objectif-affichage", { method: "PUT", body: { mode } }),
  },

creancesHistoriques: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/creances-historiques${qs ? `?${qs}` : ""}`);
    },
    create: (data) => request("/api/creances-historiques", { method: "POST", body: data }),
    reglement: (id, data) => request(`/api/creances-historiques/${id}/reglement`, { method: "POST", body: data }),
  },

etats: {
    parDate: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/etats/par-date${qs ? `?${qs}` : ""}`);
    },
    parModePaiement: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/etats/par-mode-paiement${qs ? `?${qs}` : ""}`);
    },
    parType: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/etats/par-type${qs ? `?${qs}` : ""}`);
    },
    fermetureCaisse: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/etats/fermeture-caisse${qs ? `?${qs}` : ""}`);
},
    recapBoutiques: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/etats/recap-boutiques${qs ? `?${qs}` : ""}`);
    },
    ventesParCanal: (params = {}) => {
      const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
      return request(`/api/etats/ventes-par-canal${qs ? `?${qs}` : ""}`);
    },
    parVendeur: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/etats/par-vendeur${qs ? `?${qs}` : ""}`);
    },
    parClient: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/etats/par-client${qs ? `?${qs}` : ""}`);
    },
    auditRemises: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/etats/audit-remises${qs ? `?${qs}` : ""}`);
    },
    livraisonJour: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/etats/livraison-jour${qs ? `?${qs}` : ""}`);
    },
    fraisExpedition: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/etats/frais-expedition${qs ? `?${qs}` : ""}`);
    },
    livraisons: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/etats/livraisons${qs ? `?${qs}` : ""}`);
    },
  },
};
