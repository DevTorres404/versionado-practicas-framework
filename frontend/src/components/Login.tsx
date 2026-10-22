import { useState, type FormEvent } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth, type Rol } from "../context/auth";
import { apiFetch, ApiError, authenticateOffline, saveOfflineUser, isNetworkError } from "../services/http";
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
      let data: { email: string; rol: string; token: string };

      if (!navigator.onLine) {
        data = authenticateOffline(email, password);
      } else {
        try {
          data = await apiFetch<LoginResponse>("/api/login", {
            method: "POST",
            body: JSON.stringify({ email, password }),
          });

          saveOfflineUser(data.email, data.rol === "admin" ? "admin" : "cliente", data.token);
        } catch (fetchErr: unknown) {
          if (isNetworkError(fetchErr)) {
            data = authenticateOffline(email, password);
          } else {
            throw fetchErr;
          }
        }
      }

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
            className="w-full bg-[#0a196f] hover:bg-[#071355] text-white font-bold py-3.5 px-4 rounded-lg transition-colors disabled:opacity-50 min-h-[46px] tracking-wide cursor-pointer"
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

        {/* Botón PWA */}
        <BotonInstalarApp variant="login" />

        {/* Cuentas de Prueba sin emojis y con autocompletado */}
        <div className="mt-6 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Credenciales de prueba
              </span>
            </div>
            <span className="text-[10px] text-slate-600 font-medium">
              Clic para autocompletar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@upse.edu.ec");
                setPassword("123456");
              }}
              className="text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group shadow-xs"
              title="Cargar credenciales de Administrador"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#0a196f] text-white">
                  Admin
                </span>
                <span className="text-[10px] font-medium text-slate-600 group-hover:text-[#0a196f] transition-colors">
                  Autocompletar
                </span>
              </div>
              <p className="font-mono text-xs text-slate-800 font-semibold truncate">
                admin@upse.edu.ec
              </p>
              <p className="font-mono text-[11px] text-slate-700 mt-0.5">
                Clave: <span className="font-medium text-slate-700">123456</span>
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("cliente@upse.edu.ec");
                setPassword("123456");
              }}
              className="text-left p-2.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 hover:border-slate-300 transition-all cursor-pointer group shadow-xs"
              title="Cargar credenciales de Cliente"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-cyan-700 text-white">
                  Cliente
                </span>
                <span className="text-[10px] font-medium text-slate-600 group-hover:text-cyan-800 transition-colors">
                  Autocompletar
                </span>
              </div>
              <p className="font-mono text-xs text-slate-800 font-semibold truncate">
                cliente@upse.edu.ec
              </p>
              <p className="font-mono text-[11px] text-slate-700 mt-0.5">
                Clave: <span className="font-medium text-slate-700">123456</span>
              </p>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;

