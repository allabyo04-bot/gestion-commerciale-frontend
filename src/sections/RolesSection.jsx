import { useState, useEffect, useCallback } from "react";
import { Plus, Trash2, Check } from "lucide-react";
import { api } from "../api.js";
import { ErrorBanner } from "../components/Shared.jsx";

const PERM_LABELS = [
  ["ventes", "Ventes"], ["stock", "Stock"], ["clients", "Clients / CRM"],
  ["rapports", "Rapports"], ["utilisateurs", "Utilisateurs"], ["configuration", "Configuration"],
];
const ROLE_COLORS = {
  Administrateur: { bg: "#8C3B2E", fg: "#FBF3EC" },
  Gérant: { bg: "#A8823D", fg: "#2B2320" },
  Vendeur: { bg: "#3F6B4A", fg: "#F3F7F3" },
};
function roleColor(nom) { return ROLE_COLORS[nom] || { bg: "#6B5D52", fg: "#FBF3EC" }; }

export default function RolesSection() {
  const [roles, setRoles] = useState([]);
  const [newRoleName, setNewRoleName] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try { setRoles(await api.roles.list()); } catch (e) { setError(e.message); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const togglePermission = async (role, key) => {
    const codeConfirmation = window.prompt("Code de confirmation (action sensible) :");
    if (codeConfirmation === null) return;
    try {
      await api.roles.update(role.id, { permissions: { ...role.permissions, [key]: !role.permissions[key] }, codeConfirmation });
      load();
    } catch (e) { setError(e.message); }
  };

  const addRole = async () => {
    const nom = newRoleName.trim();
    if (!nom) return;
    const codeConfirmation = window.prompt("Code de confirmation (action sensible) :");
    if (codeConfirmation === null) return;
    try {
      await api.roles.create({ nom, permissions: { ventes: false, stock: false, clients: false, rapports: false, utilisateurs: false, configuration: false }, codeConfirmation });
      setNewRoleName("");
      load();
    } catch (e) { setError(e.message); }
  };

  const deleteRole = async (role) => {
    const codeConfirmation = window.prompt("Code de confirmation (action sensible) :");
    if (codeConfirmation === null) return;
    try { await api.roles.remove(role.id, codeConfirmation); load(); } catch (e) { setError(e.message); }
  };

  const changerCode = async () => {
    const codeActuel = window.prompt("Code de confirmation actuel :");
    if (codeActuel === null) return;
    const nouveauCode = window.prompt("Nouveau code (6 caractères minimum) :");
    if (nouveauCode === null) return;
    try {
      await api.securite.changerCode(codeActuel, nouveauCode);
      window.alert("Code de confirmation changé avec succès.");
    } catch (e) { setError(e.message); }
  };

  return (
    <div>
      <ErrorBanner error={error} onClose={() => setError("")} />
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm" style={{ color: "#6B5D52" }}>Le code de confirmation est exigé en plus du PIN pour créer/modifier/supprimer un employé ou un rôle — connu uniquement de Djenie et Phil.</p>
        <button onClick={changerCode} className="text-xs px-3 py-1.5 rounded-lg font-medium whitespace-nowrap" style={{ border: "1px solid #DDD3C4", color: "#6B5D52" }}>Changer le code</button>
      </div>
      <div className="overflow-x-auto rounded-xl" style={{ border: "1px solid #EAE1D2" }}>
        <table className="w-full text-sm" style={{ background: "#FFFFFF" }}>
          <thead>
            <tr style={{ background: "#F1E9DC" }}>
              <th className="text-left px-4 py-3 font-medium">Rôle</th>
              {PERM_LABELS.map(([key, label]) => <th key={key} className="px-3 py-3 font-medium text-center font-mono text-xs" style={{ color: "#6B5D52" }}>{label}</th>)}
              <th className="px-3 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {roles.map((r) => {
              const rc = roleColor(r.nom);
              return (
                <tr key={r.id} style={{ borderTop: "1px solid #EFE7D9" }}>
                  <td className="px-4 py-3"><span className="text-xs px-2.5 py-1 rounded-full font-medium" style={{ background: rc.bg, color: rc.fg }}>{r.nom}</span></td>
                  {PERM_LABELS.map(([key]) => (
                    <td key={key} className="px-3 py-3 text-center">
                      <button disabled={r.systeme} onClick={() => togglePermission(r, key)} className="w-6 h-6 rounded flex items-center justify-center mx-auto" style={{ background: r.permissions[key] ? "#3F6B4A" : "#F1E9DC", opacity: r.systeme ? 0.6 : 1 }}>
                        {r.permissions[key] && <Check size={14} color="#F3F7F3" />}
                      </button>
                    </td>
                  ))}
                  <td className="px-3 py-3 text-right">{!r.systeme && <button onClick={() => deleteRole(r)} style={{ color: "#B04A3B" }}><Trash2 size={15} /></button>}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="flex items-center gap-2 mt-5">
        <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="Nom du nouveau rôle" className="flex-1 px-3 py-2 rounded-lg text-sm outline-none" style={{ border: "1px solid #DDD3C4", background: "#FFFFFF" }} />
        <button onClick={addRole} className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium" style={{ background: "#8C3B2E", color: "#FBF3EC" }}><Plus size={16} /> Ajouter</button>
      </div>
      <p className="text-xs mt-3" style={{ color: "#6B5D52" }}>Le rôle Administrateur garde toujours accès complet et ne peut pas être modifié.</p>
    </div>
  );
}
