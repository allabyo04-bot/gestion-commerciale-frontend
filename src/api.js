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

export const api = {
  auth: {
    login: (login, pin) => request("/api/auth/login", { method: "POST", body: { login, pin } }),
    me: () => request("/api/auth/me"),
  },
  users: {
    list: () => request("/api/users"),
    create: (data) => request("/api/users", { method: "POST", body: data }),
    update: (id, data) => request(`/api/users/${id}`, { method: "PUT", body: data }),
    remove: (id) => request(`/api/users/${id}`, { method: "DELETE" }),
  },
  roles: {
    list: () => request("/api/roles"),
    create: (data) => request("/api/roles", { method: "POST", body: data }),
    update: (id, data) => request(`/api/roles/${id}`, { method: "PUT", body: data }),
    remove: (id) => request(`/api/roles/${id}`, { method: "DELETE" }),
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
  },
  clients: {
    list: () => request("/api/clients"),
    create: (data) => request("/api/clients", { method: "POST", body: data }),
    update: (id, data) => request(`/api/clients/${id}`, { method: "PUT", body: data }),
    remove: (id) => request(`/api/clients/${id}`, { method: "DELETE" }),
    rechercheParCarte: (carte) => request(`/api/clients/recherche?carte=${encodeURIComponent(carte)}`),
  },
  ventes: {
    list: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/ventes${qs ? `?${qs}` : ""}`);
    },
    create: (data) => request("/api/ventes", { method: "POST", body: data }),
creditListe: (params = {}) => {
      const qs = new URLSearchParams(params).toString();
      return request(`/api/ventes/credit/liste${qs ? `?${qs}` : ""}`);
    },
    reglement: (id, data) => request(`/api/ventes/${id}/reglement`, { method: "POST", body: data }),
  },
  ventesAttente: {
    list: (boutique) => request(`/api/ventes-attente${boutique ? `?boutique=${encodeURIComponent(boutique)}` : ""}`),
    create: (data) => request("/api/ventes-attente", { method: "POST", body: data }),
    remove: (id) => request(`/api/ventes-attente/${id}`, { method: "DELETE" }),
  },
  cartesCadeaux: {
    list: () => request("/api/cartes-cadeaux"),
    create: (data) => request("/api/cartes-cadeaux", { method: "POST", body: data }),
    verifier: (numero) => request(`/api/cartes-cadeaux/${encodeURIComponent(numero)}/verifier`),
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
  },
};

