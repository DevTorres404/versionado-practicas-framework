import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../context/auth";

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
    title: "Dashboard Ejecutivo",
    soloAdmin: true,
    icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6",
  },
  {
    to: "/admin/productos",
    label: "Productos Admin",
    title: "Gestión de Productos",
    soloAdmin: true,
    icon: "M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4",
  },
  {
    to: "/admin/pedidos",
    label: "Pedidos Admin",
    title: "Gestión de Pedidos",
    soloAdmin: true,
    icon: "M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01",
  },
  {
    to: "/admin/liquidaciones",
    label: "Liquidaciones",
    title: "Liquidaciones a Distribuidores",
    soloAdmin: true,
    icon: "M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z",
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
    to: "/mis-pedidos",
    label: "Mis Pedidos",
    title: "Historial de Pedidos",
    icon: "M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10",
  },
  {
    to: "/mi-red",
    label: "Mi Red",
    title: "Mi Red y Comisiones",
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
      <div className={`relative z-10 px-5 py-6 flex items-center border-b border-slate-800 ${isCollapsed ? 'md:justify-center' : 'justify-start'}`}>
        <div className="w-10 h-10 rounded-xl bg-white p-1 flex items-center justify-center mr-3 flex-shrink-0 shadow-sm border border-slate-700">
          <img src="/logo-torres.png" alt="Torres" className="w-full h-full object-contain" />
        </div>
        <div className={`flex flex-col leading-tight min-w-0 ${isCollapsed ? 'md:hidden' : ''}`}>
          <span className="text-base font-extrabold tracking-tight text-white truncate">MultiCatálogo</span>
          <span className="text-[11px] font-bold tracking-widest text-cyan-400 uppercase">Torres</span>
        </div>
      </div>

      <nav className="relative z-10 flex-1 p-4 space-y-1.5 overflow-y-auto">
        {items.map((item) => {
          const esActivo = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);

          return (
            <Link
              key={item.to}
              to={item.to}
              onClick={closeMobileMenu}
              className={`flex items-center gap-3.5 p-3 rounded-lg transition-colors group ${
                esActivo
                  ? "bg-cyan-600 text-white font-semibold shadow-sm"
                  : "text-slate-400 hover:bg-slate-800 hover:text-white"
              } ${isCollapsed ? 'md:justify-center' : ''}`}
              title={item.title}
            >
              <svg className="w-5 h-5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={item.icon} />
              </svg>
              <span className={`font-medium text-sm tracking-wide ${isCollapsed ? 'md:hidden' : ''}`}>
                {item.label}
              </span>
            </Link>
          );
        })}
      </nav>

      <div className="relative z-10 p-3.5 border-t border-slate-800 m-2 rounded-lg bg-slate-800/60">
        {isCollapsed ? (
          <p className="text-center text-[10px] uppercase font-bold tracking-widest text-cyan-400">{user?.rol}</p>
        ) : (
          <div className="flex flex-col">
            <p className="text-[11px] text-slate-400 uppercase tracking-wider mb-0.5 font-medium">Perfil Activo</p>
            <p className="text-sm font-bold text-white flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span>
              <span className="uppercase tracking-wider text-cyan-400 text-xs font-bold">{user?.rol}</span>
            </p>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;