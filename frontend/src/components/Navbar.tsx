import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/cart";
import { useAuth } from "../context/auth";

interface NavbarProps {
  toggleSidebar: () => void;
}

const Navbar = ({ toggleSidebar }: NavbarProps) => {
  const { totalItems } = useCart();
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="sticky top-0 z-40 h-20 glass border-b-0 flex items-center justify-between px-4 md:px-8">
      <div className="flex items-center gap-3 md:gap-5">
        <button
          onClick={toggleSidebar}
          className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-white shadow-sm border border-slate-200 hover:bg-slate-50 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
          aria-label="Alternar menú"
        >
          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          </svg>
        </button>
        <h2 className="text-slate-800 font-bold text-lg md:text-xl hidden sm:block tracking-tight">
          {user?.rol === "admin" ? "Panel de Control" : "Tienda Elite"}
        </h2>
      </div>

      <div className="flex items-center gap-5 md:gap-8">
        <Link
          to="/carrito"
          className="relative p-3 min-w-[44px] min-h-[44px] flex items-center justify-center bg-white border border-slate-200 shadow-sm hover:shadow-md rounded-xl transition-all hover:-translate-y-0.5"
          aria-label="Ver carrito"
        >
          <svg className="w-5 h-5 text-slate-700" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z"></path></svg>
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-extrabold w-6 h-6 flex items-center justify-center rounded-full shadow-md border-2 border-white">
              {totalItems}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-3 md:gap-4 pl-4 border-l border-slate-200">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-sm font-bold text-slate-800">{user?.email.split('@')[0]}</span>
            <span className={`text-[10px] font-bold tracking-widest uppercase mt-0.5 ${user?.rol === 'admin' ? 'text-amber-600' : 'text-indigo-600'}`}>
              {user?.rol}
            </span>
          </div>

          <div className="relative group cursor-pointer">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-fuchsia-500 p-0.5 shadow-md">
              <div className="w-full h-full rounded-[10px] overflow-hidden border-2 border-white bg-white">
                <img
                  src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}&backgroundColor=f1f5f9`}
                  alt="Avatar"
                  className="w-full h-full object-cover"
                />
              </div>
            </div>

            <div className="absolute right-0 top-[120%] w-48 bg-white border border-slate-100 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 transform origin-top-right group-hover:scale-100 scale-95">
              <div className="p-4 border-b border-slate-100 md:hidden">
                <p className="text-sm font-bold text-slate-800 truncate">{user?.email}</p>
                <p className="text-xs text-indigo-600 uppercase tracking-widest mt-1 font-bold">{user?.rol}</p>
              </div>
              <div className="p-2">
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-4 py-2.5 min-h-[44px] text-sm text-red-600 font-bold hover:bg-red-50 rounded-lg transition-colors flex items-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"></path></svg>
                  Cerrar Sesión
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Navbar;