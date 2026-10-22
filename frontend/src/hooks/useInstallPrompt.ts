import { useEffect, useState } from 'react';
import { precalentarDatosOffline } from '../pwa/cacheWarming';

export interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface RelatedApplication {
  platform: string;
  url?: string;
  id?: string;
}

interface NavigatorWithRelatedApps extends Navigator {
  getInstalledRelatedApps?: () => Promise<RelatedApplication[]>;
}

const STORAGE_KEY = 'pwa_installed';

/**
 * Detecta si la ventana actual está corriendo dentro de la PWA instalada
 * (modo standalone o minimal-ui).
 */
export const isRunningStandalone = (): boolean => {
  if (typeof window === 'undefined') return false;
  return (
    window.matchMedia?.('(display-mode: standalone)').matches ||
    window.matchMedia?.('(display-mode: minimal-ui)').matches ||
    (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
    document.referrer.includes('android-app://')
  );
};

/**
 * Estado inicial sincronizado: si está en modo standalone o si ya quedó registrado
 * en localStorage tras una instalación previa, arranca en true para evitar parpadeos en F5.
 */
const getInitialInstalledState = (): boolean => {
  if (typeof window === 'undefined') return false;
  if (isRunningStandalone()) return true;
  try {
    return localStorage.getItem(STORAGE_KEY) === 'true';
  } catch {
    return false;
  }
};

export const useInstallPrompt = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState<boolean>(getInitialInstalledState);

  useEffect(() => {
    let isMounted = true;

    const markInstalled = () => {
      if (!isMounted) return;
      setIsInstalled(true);
      setDeferredPrompt(null);
      try {
        localStorage.setItem(STORAGE_KEY, 'true');
      } catch {
        // Ignorar excepciones de cuota o modo incógnito restringido
      }
    };

    const markUninstalled = () => {
      if (!isMounted) return;
      setIsInstalled(false);
      try {
        localStorage.removeItem(STORAGE_KEY);
      } catch {
        // Ignorar
      }
    };

    // Detectar si la aplicación está instalada o si fue desinstalada
    const checkInstalledStatus = async () => {
      // 1. Si corre en modo standalone (abierta desde la app instalada), siempre está instalada
      if (isRunningStandalone()) {
        markInstalled();
        return;
      }

      // 2. Comprobar si ya está instalada en el sistema mediante getInstalledRelatedApps (Chrome 80+, Edge, Android)
      const nav = navigator as NavigatorWithRelatedApps;
      if (typeof nav.getInstalledRelatedApps === 'function') {
        try {
          const relatedApps = await nav.getInstalledRelatedApps();
          if (isMounted) {
            if (relatedApps && relatedApps.length > 0) {
              markInstalled();
            } else {
              // Si devolvió lista vacía, la app NO está instalada (o fue desinstalada)
              markUninstalled();
            }
          }
        } catch {
          // Si el navegador bloquea la consulta, preservamos el estado sincronizado previo
        }
      }
    };

    void checkInstalledStatus();

    // Cuando el navegador emite 'beforeinstallprompt', significa inequívocamente que
    // la app NO está instalada y cumple con los requisitos de instalación.
    const handleBeforeInstall = (e: Event) => {
      e.preventDefault();
      if (isMounted) {
        setDeferredPrompt(e as BeforeInstallPromptEvent);
        markUninstalled();
      }
    };

    // Cuando el usuario completa la instalación
    const handleAppInstalled = () => {
      markInstalled();
      void precalentarDatosOffline();
    };

    // Al regresar a la pestaña (por ejemplo, tras desinstalar desde el sistema o ajustes)
    const handleVisibilityOrFocus = () => {
      if (document.visibilityState === 'visible') {
        void checkInstalledStatus();
      }
    };

    // Listener para cambios dinámicos en display-mode
    const mediaQuery = window.matchMedia?.('(display-mode: standalone)');
    const handleMediaChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        markInstalled();
      } else {
        void checkInstalledStatus();
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstall);
    window.addEventListener('appinstalled', handleAppInstalled);
    window.addEventListener('focus', handleVisibilityOrFocus);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);
    if (mediaQuery?.addEventListener) {
      mediaQuery.addEventListener('change', handleMediaChange);
    }

    return () => {
      isMounted = false;
      window.removeEventListener('beforeinstallprompt', handleBeforeInstall);
      window.removeEventListener('appinstalled', handleAppInstalled);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
      if (mediaQuery?.removeEventListener) {
        mediaQuery.removeEventListener('change', handleMediaChange);
      }
    };
  }, []);

  const promptInstall = async (): Promise<boolean> => {
    if (!deferredPrompt) {
      return false;
    }
    try {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        void precalentarDatosOffline();
        setIsInstalled(true);
        setDeferredPrompt(null);
        try {
          localStorage.setItem(STORAGE_KEY, 'true');
        } catch {
          // Ignorar
        }
        return true;
      }
    } catch (err) {
      console.warn('Error al solicitar instalación PWA:', err);
    }
    return false;
  };

  return {
    isInstalled,
    canPromptNative: !!deferredPrompt,
    promptInstall,
  };
};
