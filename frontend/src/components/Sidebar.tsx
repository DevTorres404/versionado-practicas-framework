// src/components/Sidebar.tsx
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

interface SidebarProps {
  isCollapsed: boolean;
  isMobileOpen: boolean;
  closeMobileMenu: () => void;
}

interface NavItem {
  to: string;
  label: string;
  title: string;
  icon: string;
  soloAdmin?: boolean;
}

const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Dashboard",
    title: "Dashboard",
    soloAdmin: true,
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    to: "/tienda",
    label: "Tienda",
    title: "Tienda",
    icon: "M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z",
  },
  {
    to: "/catalogo",
    label: "Catálogo",
    title: "Catálogo",
    icon: "M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z",
  },
  {
    to: "/mi-red",
    label: "Mi Red",
    title: "Mi Red",
    soloAdmin: true,
    icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z",
  },
];

const Sidebar = ({ isCollapsed, isMobileOpen, closeMobileMenu }: SidebarProps) => {
  const { user } = useAuth();
  const { pathname } = useLocation();

  const items = NAV_ITEMS.filter((item) => !item.soloAdmin || user?.rol === "admin");

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-50 transform bg-slate-900 border-r border-white/10 shadow-2xl text-white flex flex-col transition-all duration-300 ease-in-out
        ${isMobileOpen ? "translate-x-0" : "-translate-x-full"}
        w-64
        md:relative md:translate-x-0
        ${isCollapsed ? "md:w-20" : "md:w-64"}
      `}
    >
      {/* Decorative gradient blur in background */}
      <div className="absolute top-0 left-0 w-full h-40 bg-indigo-500/20 blur-3xl rounded-full z-0 pointer-events-none"></div>

      <div className={`relative z-10 p-5 md:p-6 text-xl font-extrabold flex items-center ${isCollapsed ? 'md:justify-center' : 'justify-start'} whitespace-nowrap`}>
        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center mr-3 shadow-lg flex-shrink-0">
          <span className="text-sm">MC</span>
        </div>
        <span className={`tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 md:hidden`}>MultiCatálogo</span>
        <span className={`tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400 hidden md:inline ${isCollapsed ? 'hidden md:hidden' : ''}`}>MultiCatálogo</span>
      </div>

      <nav className="relative z-10 flex-1 p-4 space-y-2 overflow-y-auto">
        {items.map((item) => {
          const esActivo = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={closeMobileMenu}
              className={`flex items-center gap-4 p-3 rounded-xl transition-all duration-200 group ${
                esActivo
                  ? "bg-indigo-600 shadow-md shadow-indigo-500/30 text-white"
                  : "text-slate-400 hover:bg-white/5 hover:text-white"
              } ${isCollapsed ? 'md:justify-center' : ''}`}
              title={item.title}
            >
              <svg className={`w-6 h-6 flex-shrink-0 transition-transform duration-200 ${esActivo ? '' : 'group-hover:scale-110'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className={`font-medium tracking-wide ${isCollapsed ? 'md:hidden' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 p-4 border-t border-white/10 m-2 rounded-xl bg-white/5 backdrop-blur-md">
        {isCollapsed ? (
          <p className="text-center text-[10px] uppercase font-bold tracking-widest text-indigo-300">{user?.rol}</p>
        ) : (
          <div className="flex flex-col">
            <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Perfil Activo</p>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
              <span className="uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-indigo-400 to-fuchsia-400">{user?.rol}</span>
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;