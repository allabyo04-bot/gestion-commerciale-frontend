import { ShoppingCart, Heart, FileWarning, Handshake, Briefcase, ClipboardList, Users as UsersIcon, Boxes, ShieldCheck, LogOut, BarChart3, LayoutDashboard, Wallet, Truck, Settings, Crown, Bike } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import StockSection from "./sections/StockSection.jsx";
import ClientsSection from "./sections/ClientsSection.jsx";
import VentesSection from "./sections/VentesSection.jsx";
import EtatsSection from "./sections/EtatsSection.jsx";
import DashboardSection from "./sections/DashboardSection.jsx";
import DepensesSection from "./sections/DepensesSection.jsx";
import LivraisonSection from "./sections/LivraisonSection.jsx";
import AdministrationSection from "./sections/AdministrationSection.jsx";
import FideliteSection from "./sections/FideliteSection.jsx";
import ObligationsSection from "./sections/ObligationsSection.jsx";
import FournisseursSection from "./sections/FournisseursSection.jsx";
import RHSection from "./sections/RHSection.jsx";
import LivreursSection from "./sections/LivreursSection.jsx";
import MesDemandesSection from "./sections/MesDemandesSection.jsx";
import { useState, useEffect } from "react";
import logo from "./assets/logo.png";
import { api } from "./api.js";
import { LIVRAISON_ACTIF, FIDELITE_ACTIF } from "./constants.js";

function Shell() {
  const { user, loading, logout, permissions, fonctions } = useAuth();
  const lot6 = !!fonctions.lot6;
  const lot7 = !!fonctions.lot7;
  const lot9 = !!fonctions.lot9;
  const [nbDemandesRH, setNbDemandesRH] = useState(0);
  const [employeLie, setEmployeLie] = useState(false);
  const [nbFournisseursUrgents, setNbFournisseursUrgents] = useState(0);
  const [nbObligationsUrgentes, setNbObligationsUrgentes] = useState(0);
  const [tab, setTab] = useState("accueil");
  const [ventesSubTabDemande, setVentesSubTabDemande] = useState(null);
  const [etatsSubTabDemande, setEtatsSubTabDemande] = useState(null);
  const [fideliteSubTabDemande, setFideliteSubTabDemande] = useState(null);
  const [nbRemisesEnAttente, setNbRemisesEnAttente] = useState(0);
  const estAdmin = !!user?.role?.systeme;
  useEffect(() => {
    if (!estAdmin) return;
    const rafraichir = async () => {
      try { setNbRemisesEnAttente((await api.remises.list("EN_ATTENTE")).length); } catch { /* ignore */ }
    };
    rafraichir();
    const interval = setInterval(rafraichir, 5000);
    return () => clearInterval(interval);
  }, [estAdmin]);
  // Lot 6 : pastille sur le menu Obligations = échéances dépassées ou à moins de 7 jours (administratrice seulement).
  useEffect(() => {
    if (!estAdmin || !lot6) { setNbObligationsUrgentes(0); return undefined; }
    const rafraichir = async () => {
      try { const r = await api.obligations.resume(); setNbObligationsUrgentes(r.enRetard + r.sous7); } catch { /* ignore */ }
    };
    rafraichir();
    const interval = setInterval(rafraichir, 60000);
    return () => clearInterval(interval);
  }, [estAdmin, lot6]);
  // Lot 7 : pastille sur le menu Fournisseurs = échéances de règlement dépassées ou à moins de 7 jours.
  useEffect(() => {
    if (!estAdmin || !lot7) { setNbFournisseursUrgents(0); return undefined; }
    const rafraichir = async () => {
      try { const r = await api.fournisseurs.alertes(); setNbFournisseursUrgents(r.enRetard + r.sous7); } catch { /* ignore */ }
    };
    rafraichir();
    const interval = setInterval(rafraichir, 60000);
    return () => clearInterval(interval);
  }, [estAdmin, lot7]);
  // Lot 9 : pastille « demandes à traiter » pour l'administratrice ; menu « Mes demandes » pour une employée dont le compte est relié à une fiche.
  useEffect(() => {
    if (!user || !lot9) { setNbDemandesRH(0); setEmployeLie(false); return undefined; }
    const rafraichir = async () => {
      try {
        if (estAdmin) setNbDemandesRH((await api.rh.resumeDemandes()).enAttente);
        else setEmployeLie((await api.rh.mesDemandes()).lie);
      } catch { /* ignore */ }
    };
    rafraichir();
    const interval = setInterval(rafraichir, 60000);
    return () => clearInterval(interval);
  }, [user, estAdmin, lot9]);
  if (loading) return <div style={{ minHeight: "100vh", background: "#FAF7F2" }} />;
  if (!user) return <LoginScreen />;
  // Interrupteur temporaire (voir constants.js) : le module Livraison est construit et prêt,
  // mais caché tant que Djenie n'a pas donné le feu vert.
  const NAV = [
    { id: "accueil", label: "Accueil", icon: LayoutDashboard },
    { id: "ventes", label: "Ventes", icon: ShoppingCart, perm: "ventes" },
    // Accessible avec la permission "ventes" (comme avant) OU juste "livraison" (nouveau rôle
    // Livreur, sans accès au reste de Ventes) — voir le filtre plus bas qui gère perm en tableau.
    ...(LIVRAISON_ACTIF ? [{ id: "livraison", label: "Livraison", icon: Truck, perm: ["ventes", "livraison"] }] : []),
    // Lots 1 et 10 : frais d'expédition à saisir au retour du livreur, remise de fin de journée, comptes des livreurs
    ...((fonctions.lot1 || fonctions.lot10) ? [{ id: "livreurs", label: "Livreurs", icon: Bike, perm: ["ventes", "livraison"] }] : []),
    { id: "etats", label: "États", icon: BarChart3, perm: "ventes" },
    { id: "depenses", label: "Dépenses", icon: Wallet, perm: "ventes" },
    { id: "clients", label: "Clients", icon: Heart, perm: "clients" },
    // Chantier en cours, masqué tant que Djenie n'a pas donné le feu vert (voir constants.js).
    ...(estAdmin && FIDELITE_ACTIF ? [{ id: "fidelite", label: "Fidélité", icon: Crown }] : []),
    { id: "stock", label: "Stock", icon: Boxes, perm: "stock" },
    // Lot 6 : obligations administratives (taxes, amendes, convocations, pièces), derrière l'interrupteur
    ...(estAdmin && lot6 ? [{ id: "obligations", label: "Obligations", icon: FileWarning }] : []),
    ...(estAdmin && lot7 ? [{ id: "fournisseurs", label: "Fournisseurs", icon: Handshake }] : []),
    ...(estAdmin && lot9 ? [{ id: "rh", label: "Ressources humaines", icon: Briefcase }] : []),
    ...(!estAdmin && lot9 && employeLie ? [{ id: "mes-demandes", label: "Mes demandes", icon: ClipboardList }] : []),
    // Réservé à l'administrateur : un seul menu qui regroupe journal, remises, livraisons, listes, accès.
    ...(estAdmin ? [{ id: "administration", label: "Administration", icon: Settings }] : []),
  ].filter((n) => !n.perm || (Array.isArray(n.perm) ? n.perm.some((p) => permissions[p]) : permissions[n.perm]));
  const ANCIENS = { "journal-audit": "administration", utilisateurs: "administration", roles: "administration" };
  const tabCible = ANCIENS[tab] || tab;
  const activeTab = NAV.find((n) => n.id === tabCible) ? tabCible : NAV[0]?.id;
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#FAF7F2", minHeight: "100vh", color: "#2B2320", display: "flex" }}>
      <aside className="no-print w-16 md:w-60 shrink-0" style={{ borderRight: "1px solid #DDD3C4", background: "#FFFDF9", minHeight: "100vh", display: "flex", flexDirection: "column" }}>
        <div className="flex items-center justify-center md:justify-start gap-3 px-2 md:px-5 py-5" style={{ borderBottom: "1px solid #DDD3C4" }}>
          <img src={logo} alt="La Pointure Espagnole" style={{ height: "40px", width: "auto" }} />
          <div className="hidden md:block">
            <p className="text-[10px] tracking-[0.15em] uppercase font-mono leading-tight" style={{ color: "#8C3B2E" }}>Gestion Commerciale</p>
            <p className="text-[10px] italic mt-0.5" style={{ color: "#B8A88F", fontFamily: "'Georgia', serif" }}>by Phil et Osée</p>
          </div>
        </div>
        <nav className="flex-1 overflow-y-auto px-2 md:px-3 py-4 flex flex-col gap-1">
          {NAV.map(({ id, label, icon: Icon }) => (
            <button key={id} onClick={() => setTab(id)} title={label} className="relative flex items-center justify-center md:justify-start gap-2.5 px-2 md:px-3 py-2.5 rounded-lg text-sm font-medium text-left"
              style={activeTab === id ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52" }}>
              <Icon size={18} className="shrink-0" /> <span className="truncate hidden md:inline">{label}</span>
              {id === "fournisseurs" && nbFournisseursUrgents > 0 && (
                <span className="md:ml-auto absolute top-0.5 right-0.5 md:static flex items-center justify-center rounded-full text-[10px] font-bold shrink-0"
                  style={{ background: "#B04A3B", color: "#FBF3EC", minWidth: "18px", height: "18px", padding: "0 4px" }}
                  title={`${nbFournisseursUrgents} règlement(s) fournisseur en retard ou à échéance sous 7 jours`}>
                  {nbFournisseursUrgents}
                </span>
              )}
              {id === "rh" && nbDemandesRH > 0 && (
                <span className="md:ml-auto absolute top-0.5 right-0.5 md:static flex items-center justify-center rounded-full text-[10px] font-bold shrink-0"
                  style={{ background: "#B04A3B", color: "#FBF3EC", minWidth: "18px", height: "18px", padding: "0 4px" }}
                  title={`${nbDemandesRH} demande(s) du personnel à traiter`}>
                  {nbDemandesRH}
                </span>
              )}
              {id === "obligations" && nbObligationsUrgentes > 0 && (
                <span className="md:ml-auto absolute top-0.5 right-0.5 md:static flex items-center justify-center rounded-full text-[10px] font-bold shrink-0"
                  style={{ background: "#B04A3B", color: "#FBF3EC", minWidth: "18px", height: "18px", padding: "0 4px" }}
                  title={`${nbObligationsUrgentes} obligation(s) en retard ou à échéance sous 7 jours`}>
                  {nbObligationsUrgentes}
                </span>
              )}
              {id === "ventes" && estAdmin && nbRemisesEnAttente > 0 && (
                <span className="md:ml-auto absolute top-0.5 right-0.5 md:static flex items-center justify-center rounded-full text-[10px] font-bold animate-pulse shrink-0"
                  style={{ background: "#B04A3B", color: "#FBF3EC", minWidth: "18px", height: "18px", padding: "0 4px" }}
                  title={`${nbRemisesEnAttente} remise(s) en attente de validation`}>
                  {nbRemisesEnAttente}
                </span>
              )}
            </button>
          ))}
        </nav>
        <div className="flex items-center justify-center md:justify-between gap-2 px-2 md:px-4 py-4" style={{ borderTop: "1px solid #DDD3C4" }}>
          <span className="text-sm truncate hidden md:inline" style={{ color: "#6B5D52" }}>{user.prenom} {user.nom}</span>
          <button onClick={logout} aria-label="Se déconnecter" title="Se déconnecter" style={{ color: "#8C3B2E" }}><LogOut size={18} /></button>
        </div>
      </aside>
      <div className="flex-1 min-w-0 px-6 sm:px-10 py-8 overflow-y-auto">
        <div className="max-w-6xl mx-auto">
          {activeTab === "accueil" && (
            <DashboardSection onNaviguerVentes={(sousOnglet) => { setVentesSubTabDemande(sousOnglet); setTab("ventes"); }} onNaviguerFidelite={(sousOnglet) => { setFideliteSubTabDemande(sousOnglet || null); setTab("fidelite"); }} onNaviguerEtats={(sousOnglet) => { setEtatsSubTabDemande(sousOnglet); setTab("etats"); }} />
          )}
          {activeTab === "ventes" && (
            <VentesSection subTabInitial={ventesSubTabDemande} onSubTabInitialConsomme={() => setVentesSubTabDemande(null)} />
          )}
          {activeTab === "livraison" && <LivraisonSection />}
          {activeTab === "etats" && <EtatsSection sousOngletInitial={etatsSubTabDemande} onSousOngletInitialConsomme={() => setEtatsSubTabDemande(null)} />}
          {activeTab === "livreurs" && <LivreursSection />}
          {activeTab === "depenses" && <DepensesSection />}
          {activeTab === "clients" && <ClientsSection />}
          {activeTab === "stock" && <StockSection />}
          {activeTab === "administration" && <AdministrationSection ongletInitial={tab === "utilisateurs" || tab === "roles" ? "ACCES" : "SUIVI"} peutGererAcces={!!permissions.utilisateurs} />}
          {activeTab === "obligations" && <ObligationsSection />}
          {activeTab === "fournisseurs" && <FournisseursSection />}
          {activeTab === "rh" && <RHSection onChange={() => api.rh.resumeDemandes().then((r) => setNbDemandesRH(r.enAttente)).catch(() => {})} />}
          {activeTab === "mes-demandes" && <MesDemandesSection />}
          {activeTab === "fidelite" && <FideliteSection sousOngletInitial={fideliteSubTabDemande} onSousOngletInitialConsomme={() => setFideliteSubTabDemande(null)} />}
          {!activeTab && <p className="text-sm" style={{ color: "#6B5D52" }}>Ton rôle ne donne accès à aucun module pour l'instant. Contacte un administrateur.</p>}
        </div>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}