import { useState } from "react";
import { KeyRound, UserCircle2, ShieldCheck } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

export default function LoginScreen() {
  const { login } = useAuth();
  const [loginId, setLoginId] = useState("");
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!loginId.trim() || !pin.trim()) { setError("Identifiant et PIN requis."); return; }
    setLoading(true);
    setError("");
    const ok = await login(loginId.trim(), pin.trim());
    setLoading(false);
    if (!ok) setError("Identifiant ou PIN incorrect.");
  };

  return (
    <div style={{ minHeight: "100vh", background: "#FAF7F2" }} className="flex items-center justify-center px-4">
      <div className="w-full max-w-sm rounded-xl p-8" style={{ background: "#FFFDF9", border: "1px solid #EAE1D2" }}>
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 rounded-full flex items-center justify-center mb-3" style={{ background: "#F1E9DC" }}>
            <ShieldCheck size={22} color="#8C3B2E" />
          </div>
          <p className="text-xs tracking-[0.2em] uppercase font-mono" style={{ color: "#8C3B2E" }}>Gestion Commerciale</p>
          <h1 className="font-display text-2xl font-semibold mt-1">Connexion</h1>
        </div>

        <form onSubmit={submit}>
          <label className="text-xs font-mono uppercase tracking-wide" style={{ color: "#8C3B2E" }}>Identifiant</label>
          <div className="flex items-center gap-2 mt-1 mb-4 px-3 py-2 rounded-lg" style={{ border: "1px solid #DDD3C4", background: "#FFFFFF" }}>
            <UserCircle2 size={16} color="#6B5D52" />
            <input
              value={loginId}
              onChange={(e) => setLoginId(e.target.value)}
              placeholder="ex: djenie"
              className="flex-1 outline-none bg-transparent text-sm"
              autoFocus
            />
          </div>

          <label className="text-xs font-mono uppercase tracking-wide" style={{ color: "#8C3B2E" }}>Code PIN</label>
          <div className="flex items-center gap-2 mt-1 mb-5 px-3 py-2 rounded-lg" style={{ border: "1px solid #DDD3C4", background: "#FFFFFF" }}>
            <KeyRound size={16} color="#6B5D52" />
            <input
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              placeholder="••••"
              type="password"
              inputMode="numeric"
              maxLength={6}
              className="flex-1 outline-none bg-transparent text-sm tracking-widest"
            />
          </div>

          {error && (
            <p className="text-xs mb-4 px-3 py-2 rounded-lg" style={{ background: "#FBEAE7", color: "#8C3B2E", border: "1px solid #E3B6AD" }}>
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full px-4 py-2.5 rounded-lg text-sm font-medium"
            style={{ background: "#8C3B2E", color: "#FBF3EC", opacity: loading ? 0.7 : 1 }}
          >
            {loading ? "Connexion…" : "Se connecter"}
          </button>
        </form>
      </div>
    </div>
  );
}
