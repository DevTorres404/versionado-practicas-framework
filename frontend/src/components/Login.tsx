import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, type Rol } from "../context/auth";
import { apiFetch, ApiError } from "../services/http";
import { BotonInstalarApp } from "./BotonInstalarApp";

interface LoginResponse {
  token: string;
  email: string;
  rol: string;
}

const Login = () => {
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

  const navigate = useNavigate();
  const { login } = useAuth();

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const data = await apiFetch<LoginResponse>("/api/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      });

      const rol: Rol = data.rol === "admin" ? "admin" : "cliente";
      login({ email: data.email, rol }, data.token);
      navigate(rol === "admin" ? "/" : "/tienda");
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Error al iniciar sesión");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 px-4 py-8 relative overflow-hidden">
      {/* Luces ambientales en Índigo y Turquesa */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] rounded-full bg-indigo-900/30 blur-[130px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] rounded-full bg-teal-500/25 blur-[140px] pointer-events-none" />

      <div className="max-w-md w-full bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl p-8 border border-white/40 relative z-10 animate-fade-in">
        {/* Cabecera con Logotipo Oficial Torres */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-3">
            <div className="w-20 h-20 rounded-2xl p-1 bg-gradient-to-tr from-indigo-900 via-teal-600 to-cyan-400 shadow-xl shadow-cyan-900/20 flex items-center justify-center">
              <img
                src="/logo-torres.png"
                alt="Logotipo Torres"
                className="w-full h-full object-cover rounded-xl bg-white"
              />
            </div>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            MultiCatálogo <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-700 via-teal-600 to-cyan-600">Torres</span>
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Ingresa a tu cuenta para continuar
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 p-3.5 rounded-xl text-sm mb-6 text-center border border-red-200/80 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-slate-800 placeholder-slate-400 text-sm font-medium"
              placeholder="admin@upse.edu.ec"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none transition text-slate-800 placeholder-slate-400 text-sm font-medium"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-indigo-900 via-teal-700 to-cyan-600 hover:from-indigo-950 hover:via-teal-800 hover:to-cyan-700 text-white font-extrabold py-3.5 px-4 rounded-xl shadow-lg shadow-teal-900/20 hover:shadow-teal-900/30 transition-all hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 min-h-[46px] tracking-wide"
          >
            {loading ? "Validando credenciales..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          ¿No tienes una cuenta?{" "}
          <Link to="/registro" className="text-teal-700 hover:text-indigo-900 font-bold underline transition-colors">
            Regístrate aquí
          </Link>
        </div>

        {/* Botón Prominente para Instalar PWA */}
        <div className="mt-6 pt-6 border-t border-slate-100">
          <BotonInstalarApp variant="login" />
        </div>

        {/* Credenciales de Prueba */}
        <div className="mt-6 p-4 bg-slate-50/90 rounded-xl border border-slate-200/70 text-xs text-slate-600 space-y-1.5">
          <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px] mb-1">Cuentas de prueba:</p>
          <div className="flex items-center justify-between py-0.5">
            <span className="font-semibold text-indigo-950">👑 Admin:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">admin@upse.edu.ec / 123456</span>
          </div>
          <div className="flex items-center justify-between py-0.5">
            <span className="font-semibold text-teal-900">🛍️ Cliente:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">cliente@upse.edu.ec / 123456</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;