import { useState, useEffect } from "react";
import { Outlet } from "react-router-dom";
import Sidebar from "./Sidebar";
import Navbar from "./Navbar";
import BannerOffline from "./BannerOffline";
import ActualizacionDisponible from "./ActualizacionDisponible";

const Layout = () => {
  const [isCollapsed, setIsCollapsed] = useState(() => window.innerWidth < 1024);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const handleResize = () => {
      setIsCollapsed(window.innerWidth < 1024);
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const handleToggleSidebar = () => {
    if (window.innerWidth < 768) {
      setMobileOpen((prev) => !prev);
    } else {
      setIsCollapsed((prev) => !prev);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* Mobile Backdrop */}
      {mobileOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 md:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      <Sidebar
        isCollapsed={isCollapsed}
        isMobileOpen={mobileOpen}
        closeMobileMenu={() => setMobileOpen(false)}
      />

      <div className="flex-1 flex flex-col h-screen overflow-hidden">
        <Navbar
          toggleSidebar={handleToggleSidebar}
        />
        <main className="flex-1 overflow-x-hidden overflow-y-auto bg-slate-50">
          <Outlet />
        </main>
      </div>

      {/* Avisos globales de la PWA: sin conexión y actualizaciones.
          Van en un contenedor fijo al pie para que se apilen entre sí sin
          taparse y sin empujar el contenido. `pointer-events-none` en el
          contenedor para no bloquear los toques del contenido que queda
          detrás; cada aviso reactiva los eventos por sí mismo. */}
      <div className="fixed inset-x-0 bottom-0 z-50 flex flex-col gap-2 px-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] pt-3 pointer-events-none">
        <BannerOffline />
        <ActualizacionDisponible />
      </div>
    </div>
  );
};

export default Layout;