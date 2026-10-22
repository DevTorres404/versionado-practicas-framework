import { useState } from 'react';
import { useInstallPrompt } from '../hooks/useInstallPrompt';
import { precalentarDatosOffline } from '../pwa/cacheWarming';

interface BotonInstalarAppProps {
  variant?: 'navbar' | 'sidebar' | 'login';
}

export const BotonInstalarApp = ({ variant = 'login' }: BotonInstalarAppProps) => {
  const { isInstalled, canPromptNative, promptInstall } = useInstallPrompt();
  const [mostrarGuia, setMostrarGuia] = useState(false);

  // Si la aplicación ya está instalada o corriendo en ventana standalone, no mostramos el botón
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    // Calentamiento proactivo de los datos disponibles para uso offline inmediato
    void precalentarDatosOffline();

    if (canPromptNative) {
      await promptInstall();
    } else {
      setMostrarGuia(true);
    }
  };

  if (variant === 'login') {
    return (
      <div className="mt-6 pt-6 border-t border-slate-200">
        <button
          onClick={handleClick}
          type="button"
          className="w-full flex items-center justify-center gap-2.5 px-4 py-3 bg-white hover:bg-slate-50 border-2 border-cyan-600 text-cyan-900 font-bold text-sm rounded-lg transition-colors min-h-[46px] cursor-pointer shadow-xs"
          title="Instalar MultiCatálogo Torres como aplicación en tu pantalla de inicio"
        >
          <svg className="w-4 h-4 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span>Instalar App</span>
        </button>

        {mostrarGuia && (
          <GuiaInstalacionModal onClose={() => setMostrarGuia(false)} />
        )}
      </div>
    );
  }

  if (variant === 'sidebar') {
    return (
      <>
        <button
          onClick={handleClick}
          type="button"
          className="w-full flex items-center gap-3 p-3 rounded-lg bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-700 transition-colors font-semibold text-sm border border-slate-700 cursor-pointer"
          title="Instalar MultiCatálogo Torres en tu dispositivo"
        >
          <svg className="w-4 h-4 text-cyan-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          <span className="truncate">Instalar App</span>
        </button>

        {mostrarGuia && (
          <GuiaInstalacionModal onClose={() => setMostrarGuia(false)} />
        )}
      </>
    );
  }

  return (
    <>
      <button
        onClick={handleClick}
        type="button"
        className="flex items-center gap-2 px-3 py-2 bg-cyan-600 hover:bg-cyan-700 text-white text-xs sm:text-sm font-bold rounded-lg transition-colors min-h-[44px] cursor-pointer"
        title="Instalar aplicación en tu pantalla de inicio"
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        <span>Instalar App</span>
      </button>

      {mostrarGuia && (
        <GuiaInstalacionModal onClose={() => setMostrarGuia(false)} />
      )}
    </>
  );
};

interface TipoNavegador {
  esIOS: boolean;
  esSafariMac: boolean;
  esFirefoxMobile: boolean;
  esFirefoxDesktop: boolean;
}

const detectarNavegador = (): TipoNavegador => {
  if (typeof navigator === 'undefined') {
    return { esIOS: false, esSafariMac: false, esFirefoxMobile: false, esFirefoxDesktop: false };
  }
  const ua = navigator.userAgent;

  // iOS (iPhone, iPad, iPod)
  const esIOS =
    /iPad|iPhone|iPod/.test(ua) &&
    !(window as unknown as { MSStream?: unknown }).MSStream;

  // Firefox
  const esFirefox = /Firefox|FxiOS/i.test(ua);
  const esFirefoxMobile = esFirefox && /Mobile|Android/i.test(ua);
  const esFirefoxDesktop = esFirefox && !esFirefoxMobile;

  // Safari en macOS (excluyendo Chrome, Edge y Firefox)
  const esSafariMac =
    /Macintosh/i.test(ua) &&
    /Safari/i.test(ua) &&
    !/Chrome|Chromium|Edg|CriOS|FxiOS/i.test(ua);

  return { esIOS, esSafariMac, esFirefoxMobile, esFirefoxDesktop };
};

interface GuiaModalProps {
  onClose: () => void;
}

const GuiaInstalacionModal = ({ onClose }: GuiaModalProps) => {
  const { esIOS, esSafariMac, esFirefoxMobile, esFirefoxDesktop } = detectarNavegador();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl shadow-xl max-w-sm w-full p-6 text-slate-800 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-3 border-b border-slate-100">
          <h3 className="font-extrabold text-base flex items-center gap-2 text-[#0a196f]">
            <svg className="w-5 h-5 text-cyan-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
            </svg>
            Instalar MultiCatálogo Torres
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
            aria-label="Cerrar"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="py-4 space-y-3 text-sm text-slate-600">
          {esIOS ? (
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
          ) : esSafariMac ? (
            <>
              <p className="font-medium text-slate-800">Para instalar en Mac (Safari):</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  En la barra superior de Safari, hacé clic en el menú <strong>Archivo</strong>.
                </li>
                <li>
                  Seleccioná <strong>"Agregar al Dock..."</strong>.
                </li>
                <li>Confirmá haciendo clic en <strong>Agregar</strong>.</li>
              </ol>
            </>
          ) : esFirefoxMobile ? (
            <>
              <p className="font-medium text-slate-800">Para instalar en Firefox (Android):</p>
              <ol className="list-decimal list-inside space-y-2">
                <li>
                  Tocá el menú de <strong>tres puntos (⋮)</strong> junto a la barra de direcciones.
                </li>
                <li>
                  Seleccioná <strong>"Instalar"</strong> o <strong>"Agregar a la pantalla principal"</strong>.
                </li>
                <li>Confirmá en la ventana emergente.</li>
              </ol>
            </>
          ) : esFirefoxDesktop ? (
            <>
              <p className="font-medium text-slate-800">Firefox en Escritorio:</p>
              <p className="text-xs text-slate-500 leading-relaxed">
                Firefox en escritorio no soporta la instalación de aplicaciones web como ventanas independientes.
              </p>
              <ol className="list-decimal list-inside space-y-2 text-xs">
                <li>
                  Para instalar la app, abrí MultiCatálogo Torres en <strong>Google Chrome</strong> o <strong>Microsoft Edge</strong>.
                </li>
                <li>
                  O guardá esta página en tus marcadores con <strong>Ctrl + D</strong>.
                </li>
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
            className="px-4 py-2 bg-[#0a196f] text-white rounded-lg text-sm font-bold hover:bg-[#071355] transition-colors cursor-pointer"
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
};

export default BotonInstalarApp;
