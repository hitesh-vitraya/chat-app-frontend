const listeners = new Set();
const requestListeners = new Set();

export const subscribeToLogout = (listener) => {
  console.log('[logout] subscribeToLogout');
  listeners.add(listener);

  return () => {
    console.log('[logout] unsubscribeToLogout');
    listeners.delete(listener);
  };
};

export const triggerLogout = () => {
  console.log('[logout] triggerLogout listeners:', listeners.size);
  listeners.forEach((listener) => listener());
};

export const subscribeToLogoutRequest = (listener) => {
  console.log('[logout] subscribeToLogoutRequest');
  requestListeners.add(listener);

  return () => {
    console.log('[logout] unsubscribeToLogoutRequest');
    requestListeners.delete(listener);
  };
};

export const requestLogoutConfirmation = () => {
  console.log('[logout] requestLogoutConfirmation listeners:', requestListeners.size);
  requestListeners.forEach((listener) => listener());
};
