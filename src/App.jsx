import { ShoppingCart, Heart, Users as UsersIcon, Boxes, ShieldCheck, LogOut, BarChart3 } from "lucide-react";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import LoginScreen from "./components/LoginScreen.jsx";
import UtilisateursSection from "./sections/UtilisateursSection.jsx";
import StockSection from "./sections/StockSection.jsx";
import ClientsSection from "./sections/ClientsSection.jsx";
import VentesSection from "./sections/VentesSection.jsx";
import RolesSection from "./sections/RolesSection.jsx";
import EtatsSection from "./sections/EtatsSection.jsx";
import { useState } from "react";

function Shell() {
  const { user, loading, logout, permissions } = useAuth();
  const [tab, setTab] = useState("ventes");
  if (loading) return <div style={{ minHeight: "100vh", background: "#FAF7F2" }} />;
  if (!user) return <LoginScreen />;
  const NAV = [
    { id: "ventes", label: "Ventes", icon: ShoppingCart, perm: "ventes" },
    { id: "etats", label: "États", icon: BarChart3, perm: "ventes" },
    { id: "clients", label: "Clients", icon: Heart, perm: "clients" },
    { id: "utilisateurs", label: "Utilisateurs", icon: UsersIcon, perm: "utilisateurs" },
    { id: "stock", label: "Stock", icon: Boxes, perm: "stock" },
    { id: "roles", label: "Rôles", icon: ShieldCheck, perm: "utilisateurs" },
  ].filter((n) => permissions[n.perm]);
  // Si l'onglet actuellement sélectionné n'est plus accessible (changement de rôle, etc.), on retombe sur le premier disponible
  const activeTab = NAV.find((n) => n.id === tab) ? tab : NAV[0]?.id;
  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#FAF7F2", minHeight: "100vh", color: "#2B2320" }}>
      <header className="no-print px-6 py-5 sm:px-10" style={{ borderBottom: "1px solid #DDD3C4", background: "#FFFDF9" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between flex-wrap gap-4">
          <div>
            <p className="text-xs tracking-[0.2em] uppercase font-mono" style={{ color: "#8C3B2E" }}>Gestion Commerciale</p>
            <h1 className="font-display text-2xl sm:text-3xl font-semibold mt-1">Chaussures & Maroquinerie</h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex gap-2 flex-wrap">
              {NAV.map(({ id, label, icon: Icon }) => (
                <button key={id} onClick={() => setTab(id)} className="flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-medium"
                  style={activeTab === id ? { background: "#2B2320", color: "#FBF3EC" } : { background: "transparent", color: "#6B5D52", border: "1px solid #DDD3C4" }}>
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 pl-3" style={{ borderLeft: "1px solid #DDD3C4" }}>
              <span className="text-sm" style={{ color: "#6B5D52" }}>{user.prenom} {user.nom}</span>
              <button onClick={logout} aria-label="Se déconnecter" style={{ color: "#8C3B2E" }}><LogOut size={16} /></button>
            </div>
          </div>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-6 sm:px-10 py-8">
        {activeTab === "ventes" && <VentesSection />}
        {activeTab === "etats" && <EtatsSection />}
        {activeTab === "clients" && <ClientsSection />}
        {activeTab === "utilisateurs" && <UtilisateursSection />}
        {activeTab === "stock" && <StockSection />}
        {activeTab === "roles" && <RolesSection />}
        {!activeTab && <p className="text-sm" style={{ color: "#6B5D52" }}>Ton rôle ne donne accès à aucun module pour l'instant. Contacte un administrateur.</p>}
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