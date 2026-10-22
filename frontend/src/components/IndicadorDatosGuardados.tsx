// src/components/IndicadorDatosGuardados.tsx
/**
 * Insignia discreta que aclara que lo que se está viendo viene de la caché
 * local del service worker y no del servidor.
 *
 * Sin esta aclaración, un usuario sin conexión puede creer que el precio o el
 * saldo de la red es el valor real en el servidor.
 */
const IndicadorDatosGuardados = () => {
  return (
    <span className="inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
      Datos guardados
    </span>
  );
};

export default IndicadorDatosGuardados;
