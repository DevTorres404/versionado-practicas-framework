import { useState } from "react";
import { Link } from "react-router-dom";
import { LayoutDashboard, ShoppingBag, Network } from "lucide-react";

interface SidebarProps {
  isCollapsed: boolean;
  mobileOpen: boolean;
  onClose: () => void;
}

const navLinks = [
  {
    to: "/",
    label: "Dashboard",
    icon: <LayoutDashboard size={18} className="shrink-0" />,
  },
  {
    to: "/catalogo",
    label: "Catálogo",
    icon: <ShoppingBag size={18} className="shrink-0" />,
  },
  {
    to: "/mi-red",
    label: "Mi Red",
    icon: <Network size={18} className="shrink-0" />,
  },
];

const Sidebar = ({ isCollapsed, mobileOpen, onClose }: SidebarProps) => {
  const [hovered, setHovered] = useState(false);

  // Si está colapsado y hay hover, se muestra expandido; si no, respeta isCollapsed
  const showExpanded = !isCollapsed || hovered;

  const renderNav = (showLabels: boolean, handleNav: () => void) => (
    <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
      {navLinks.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          title={link.label}
          onClick={handleNav}
          className="flex items-center gap-3 p-3 rounded-md hover:bg-stone-700 transition-colors overflow-hidden text-stone-300 hover:text-white"
        >
          {link.icon}
          {showLabels && <span className="whitespace-nowrap">{link.label}</span>}
        </Link>
      ))}
    </nav>
  );

  return (
    <>
      {/* Mobile drawer (slide-in) */}
      <aside
        className={`fixed top-16 bottom-0 left-0 z-50 w-72 bg-stone-900 text-stone-100 flex flex-col transition-transform duration-300 md:hidden ${
          mobileOpen ? "translate-x-0 shadow-2xl" : "-translate-x-full"
        }`}
      >
        <div className="p-6 text-2xl font-bold border-b border-stone-700 whitespace-nowrap tracking-tight">
          MultiCatálogo
        </div>
        {renderNav(true, onClose)}
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          aria-label="Cerrar menú"
          onClick={onClose}
          className="fixed top-16 inset-x-0 bottom-0 z-40 bg-black/50 md:hidden"
        />
      )}

      {/* Desktop sidebar */}
      <aside
        style={{ width: showExpanded ? "256px" : "80px" }}
        className="hidden md:flex bg-stone-900 text-stone-100 flex-col transition-all duration-300 overflow-hidden"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div className="p-6 text-2xl font-bold border-b border-stone-700 whitespace-nowrap tracking-tight">
          {showExpanded ? "MultiCatálogo" : "MC"}
        </div>
        {renderNav(showExpanded, () => {})}
      </aside>
    </>
  );
};

export default Sidebar;