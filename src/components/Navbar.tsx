import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCart } from "../context/CartContext";
import { useAuth } from "../context/AuthContext";
import { PanelLeft, PanelLeftClose, Menu, X } from "lucide-react";

interface NavbarProps {
  onToggleSidebar: () => void;
  isCollapsed: boolean;
  mobileOpen: boolean;
}

const Navbar = ({ onToggleSidebar, isCollapsed, mobileOpen }: NavbarProps) => {
  const { totalItems } = useCart();
  const { logout, userEmail } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="h-16 bg-white border-b border-stone-200 flex items-center justify-between px-4 sm:px-6 lg:px-8 gap-3">
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onToggleSidebar}
          aria-label={mobileOpen ? "Cerrar menú" : "Abrir menú"}
          className="p-3 md:p-2 rounded-md text-stone-500 hover:text-stone-900 hover:bg-stone-100 transition-colors shrink-0"
        >
          <span className="md:hidden">
            {mobileOpen ? <X size={20} /> : <Menu size={20} />}
          </span>
          <span className="hidden md:block">
            {isCollapsed ? <PanelLeft size={20} /> : <PanelLeftClose size={20} />}
          </span>
        </button>

        <h2 className="hidden sm:block text-stone-500 font-medium text-sm tracking-wide uppercase truncate">
          Panel de Administración
        </h2>
      </div>

      <div className="flex items-center gap-3 md:gap-6 shrink-0">
        <Link
          to="/carrito"
          aria-label={`Carrito de compras${totalItems > 0 ? ` (${totalItems} productos)` : ""}`}
          className="relative p-3 md:p-2 hover:bg-stone-100 rounded-full transition-colors"
        >
          <span className="text-xl" aria-hidden="true">
            🛒
          </span>
          {totalItems > 0 && (
            <span className="absolute top-0 right-0 bg-stone-800 text-white text-xs font-bold w-5 h-5 flex items-center justify-center rounded-full transform translate-x-1 -translate-y-1">
              {totalItems}
            </span>
          )}
        </Link>

        <div className="flex items-center gap-3">
          <div
            className="relative"
            onMouseEnter={() => setMenuOpen(true)}
            onMouseLeave={() => setMenuOpen(false)}
          >
            <button
              type="button"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Menú de usuario"
              className="p-2 rounded-full focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              <div className="w-8 h-8 rounded-full bg-stone-200 overflow-hidden border border-stone-300 flex items-center justify-center">
                <img
                  src="https://fastly.picsum.photos/id/64/4326/2884.jpg?hmac=9_SzX666YRpR_fOyYStXpfSiJ_edO3ghlSRnH2w09Kg"
                  alt="Avatar del usuario"
                  className="w-full h-full object-cover"
                />
              </div>
            </button>

            {menuOpen && (
              <div className="absolute right-0 top-full z-50 pt-2">
                <div className="w-36 bg-white border border-stone-200 rounded-lg shadow-lg">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-600 font-semibold hover:bg-red-50 rounded-md transition-colors"
                  >
                    Cerrar Sesión
                  </button>
                </div>
              </div>
            )}
          </div>

          {userEmail && (
            <span className="hidden lg:block text-sm text-stone-500">
              {userEmail}
            </span>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;