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
    <div className="min-h-screen flex items-center justify-center bg-slate-100 px-4 py-8">
      <div className="max-w-md w-full bg-white rounded-2xl shadow-sm border border-slate-200 p-8">
        {/* Cabecera Minimalista */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <img
              src="/logo-torres.png"
              alt="Logotipo Torres"
              className="w-20 h-20 object-contain"
            />
          </div>
          <div className="inline-block px-3 py-1 bg-cyan-50 border border-cyan-200 rounded-full mb-3">
            <span className="text-xs font-bold text-cyan-800 tracking-wider uppercase">Cosmética & Red</span>
          </div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight">
            MultiCatálogo Torres
          </h2>
          <p className="text-slate-500 mt-1 text-sm font-medium">
            Ingresa a tu cuenta para continuar
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 p-3.5 rounded-lg text-sm mb-6 text-center border border-red-200 font-medium">
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
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#0a196f] focus:ring-1 focus:ring-[#0a196f] outline-none transition text-slate-800 placeholder-slate-400 text-sm font-medium"
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
              className="w-full px-4 py-3 rounded-lg border border-slate-300 focus:border-[#0a196f] focus:ring-1 focus:ring-[#0a196f] outline-none transition text-slate-800 placeholder-slate-400 text-sm font-medium"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0a196f] hover:bg-[#071355] text-white font-bold py-3.5 px-4 rounded-lg transition-colors disabled:opacity-50 min-h-[46px] tracking-wide"
          >
            {loading ? "Validando credenciales..." : "Iniciar Sesión"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-600">
          ¿No tienes una cuenta?{" "}
          <Link to="/registro" className="text-cyan-700 hover:text-[#0a196f] font-bold underline transition-colors">
            Regístrate aquí
          </Link>
        </div>

        {/* Botón PWA Minimalista */}
        <div className="mt-6 pt-6 border-t border-slate-200">
          <BotonInstalarApp variant="login" />
        </div>

        {/* Cuentas de Prueba */}
        <div className="mt-6 p-4 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-2">
          <p className="font-bold text-slate-800 uppercase tracking-wider text-[11px]">Cuentas de prueba:</p>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-[#0a196f]">👑 Admin:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">admin@upse.edu.ec / 123456</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="font-semibold text-cyan-800">🛍️ Cliente:</span>
            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">cliente@upse.edu.ec / 123456</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;