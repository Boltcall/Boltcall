import { useEffect } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

function PWAUpdatePrompt() {
  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, registration) {
      if (registration) {
        registration.update();
        setInterval(() => {
          registration.update();
        }, 5 * 60 * 1000);
      }
    },
    onRegisterError(error) {
      console.error('SW registration error:', error);
    },
  });

  useEffect(() => {
    if (needRefresh) {
      updateServiceWorker(true).then(() => {
        window.location.reload();
      });
    }
  }, [needRefresh, updateServiceWorker]);

  return null;
}

export default PWAUpdatePrompt;
