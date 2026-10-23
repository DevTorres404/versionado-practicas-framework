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
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-50 to-indigo-50/40 px-4 py-10 overflow-hidden">
      {/* Resplandor ambiental de fondo */}
      <div className="absolute -top-32 -left-32 w-80 h-80 bg-indigo-200/35 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-80 h-80 bg-cyan-200/30 rounded-full blur-3xl pointer-events-none" />

      <div className="relative w-full max-w-md bg-white/95 backdrop-blur-md rounded-2xl shadow-xl shadow-slate-200/70 border border-slate-200/80 p-8 sm:p-9 transition-all">
        {/* Cabecera de Marca */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 ring-1 ring-slate-900/5">
              <img
                src="/logo-torres.png"
                alt="Logotipo Torres"
                className="w-16 h-16 object-contain"
              />
            </div>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            MultiCatálogo Torres
          </h1>
          <p className="text-slate-500 mt-1.5 text-sm font-medium">
            Ingresa a tu cuenta para continuar
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-2.5 bg-rose-50 text-rose-700 p-3.5 rounded-xl text-sm mb-6 border border-rose-200 font-medium animate-fadeIn">
            <svg className="w-4 h-4 shrink-0 text-rose-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Correo Electrónico
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#0a196f] focus:ring-4 focus:ring-[#0a196f]/10 outline-none transition text-slate-800 placeholder-slate-400 text-sm font-medium"
              placeholder="admin@upse.edu.ec"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Contraseña
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-slate-200 bg-slate-50/60 focus:bg-white focus:border-[#0a196f] focus:ring-4 focus:ring-[#0a196f]/10 outline-none transition text-slate-800 placeholder-slate-400 text-sm font-medium"
              placeholder="••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#0a196f] hover:bg-[#071355] active:scale-[0.99] text-white font-bold py-3.5 px-4 rounded-xl transition-all duration-150 disabled:opacity-50 min-h-[48px] tracking-wide cursor-pointer shadow-md shadow-[#0a196f]/20 hover:shadow-lg hover:shadow-[#0a196f]/25 flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                <span>Validando credenciales...</span>
              </>
            ) : (
              "Iniciar Sesión"
            )}
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
        <div className="mt-6 p-4 bg-slate-50/90 rounded-xl border border-slate-200 text-xs text-slate-600">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Credenciales de prueba
              </span>
            </div>
            <span className="text-[10px] text-slate-500 font-medium">
              Clic para autocompletar
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <button
              type="button"
              onClick={() => {
                setEmail("admin@upse.edu.ec");
                setPassword("123456");
              }}
              className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-[#0a196f]/40 hover:bg-slate-50 hover:shadow-xs transition-all duration-150 cursor-pointer group"
              title="Cargar credenciales de Administrador"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-[#0a196f] text-white">
                  Admin
                </span>
                <span className="text-[10px] font-medium text-slate-500 group-hover:text-[#0a196f] transition-colors">
                  Autocompletar
                </span>
              </div>
              <p className="font-mono text-xs text-slate-800 font-semibold truncate">
                admin@upse.edu.ec
              </p>
              <p className="font-mono text-[11px] text-slate-600 mt-0.5">
                Clave: <span className="font-medium text-slate-700">123456</span>
              </p>
            </button>

            <button
              type="button"
              onClick={() => {
                setEmail("cliente@upse.edu.ec");
                setPassword("123456");
              }}
              className="text-left p-3 rounded-xl border border-slate-200 bg-white hover:border-cyan-600/40 hover:bg-slate-50 hover:shadow-xs transition-all duration-150 cursor-pointer group"
              title="Cargar credenciales de Cliente"
            >
              <div className="flex items-center justify-between mb-1.5">
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold tracking-wider uppercase bg-cyan-700 text-white">
                  Cliente
                </span>
                <span className="text-[10px] font-medium text-slate-500 group-hover:text-cyan-800 transition-colors">
                  Autocompletar
                </span>
              </div>
              <p className="font-mono text-xs text-slate-800 font-semibold truncate">
                cliente@upse.edu.ec
              </p>
              <p className="font-mono text-[11px] text-slate-600 mt-0.5">
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

