import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';

interface BotonInstalarAppProps {
  variant?: 'navbar' | 'sidebar' | 'login';
}

export const BotonInstalarApp = ({ variant = 'login' }: BotonInstalarAppProps) => {
  const { isInstalled, canPromptNative, promptInstall } = useInstallPrompt();
  const [mostrarGuia, setMostrarGuia] = useState(false);

  // Si la aplicación ya está corriendo instalada (standalone), no mostramos el botón
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (canPromptNative) {
      await promptInstall();
    } else {
      setMostrarGuia(true);
    }
  };

  const isIOS =
    /iPad|iPhone|iPod/.test(navigator.userAgent) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  if (variant === 'login') {
    return (
      <>
        <button
          onClick={handleClick}
          type="button"
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-gradient-to-r from-indigo-50 to-fuchsia-50 hover:from-indigo-100 hover:to-fuchsia-100 border border-indigo-200 text-indigo-700 font-bold text-sm rounded-xl transition-all shadow-sm hover:shadow min-h-[44px]"
          title="Instalar MultiCatálogo Torres como aplicación en tu pantalla de inicio"
        >
          <svg className="w-5 h-5 text-indigo-600 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Instalar MultiCatálogo Torres (App)</span>
        </button>

        {mostrarGuia && (
          <GuiaInstalacionModal isIOS={isIOS} onClose={() => setMostrarGuia(false)} />
        )}
      </>
    );
  }

  if (variant === 'sidebar') {
    return (
      <>
        <button
          onClick={handleClick}
          type="button"
          className="w-full flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-indigo-500/20 to-fuchsia-500/20 border border-indigo-400/30 text-indigo-200 hover:text-white hover:bg-indigo-600/30 transition-all font-semibold text-sm group"
          title="Instalar MultiCatálogo Torres en tu dispositivo"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-500/30 flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
            <svg className="w-4 h-4 text-indigo-300 group-hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </div>
          <span className="truncate">Instalar App</span>
        </button>

        {mostrarGuia && (
          <GuiaInstalacionModal isIOS={isIOS} onClose={() => setMostrarGuia(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        type="button"
        className="flex items-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-700 hover:to-fuchsia-700 text-white text-xs sm:text-sm font-bold rounded-xl shadow-md hover:shadow-lg transition-all hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-indigo-500 min-h-[44px]"
        title="Instalar aplicación en tu pantalla de inicio"
      >
        <svg className="w-4 h-4 animate-bounce" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Instalar App</span>
      </button>

      {mostrarGuia && (
        <GuiaInstalacionModal isIOS={isIOS} onClose={() => setMostrarGuia(false)} />
      )}
    </>
  );
};

interface GuiaModalProps {
  isIOS: boolean;
  onClose: () => void;
}

const GuiaInstalacionModal = ({ isIOS, onClose }: GuiaModalProps) => {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl max-w-sm w-full p-6 text-slate-800 border border-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-extrabold text-base flex items-center gap-2 text-indigo-700">
            <svg className="w-5 h-5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Instalar MultiCatálogo Torres
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="py-4 space-y-3 text-sm text-slate-600">
          {isIOS ? (
            <>
              <p className="font-medium text-slate-800">Para instalar en iPhone / iPad (Safari):</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Tocá el botón <strong>Compartir</strong> (icono <span className="inline-block px-1.5 py-0.5 bg-slate-100 rounded border border-slate-200">⎋</span> con flecha hacia arriba).
                </li>
                <li>
                  Buscá y seleccioná <strong>"Agregar a pantalla de inicio"</strong>.
                </li>
                <li>Confirmá tocando <strong>Agregar</strong> arriba a la derecha.</li>
              </ol>
            </>
          ) : (
            <>
              <p className="font-medium text-slate-800">Cómo instalar la aplicación:</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  En la <strong>barra de direcciones</strong> arriba, hacé clic en el icono de <strong>Instalar</strong> (pantalla con flecha).
                </li>
                <li>
                  O abrí el menú de <strong>3 puntos (⋮)</strong> de tu navegador y seleccioná <strong>"Instalar MultiCatálogo Torres"</strong>.
                </li>
              </ol>
            </>
          )}
        </div>

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-colors"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default BotonInstalarApp;
