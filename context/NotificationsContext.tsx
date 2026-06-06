import { createContext, useContext } from 'react';
import { useNotifications } from '../hooks/useNotifications';

interface NotificationsContextValue {
  permissionGranted: boolean;
  token: string | undefined;
  requestPermission: () => Promise<boolean>;
  clearTokens: () => Promise<void>;
}

const NotificationsContext = createContext<NotificationsContextValue>({
  permissionGranted: false,
  token: undefined,
  requestPermission: async () => false,
  clearTokens: async () => {},
});

export function NotificationsProvider({ uid, children }: { uid: string | undefined; children: React.ReactNode }) {
  const value = useNotifications(uid);
  return (
    <NotificationsContext.Provider value={value}>
      {children}
    </NotificationsContext.Provider>
  );
}

export function useNotificationsContext() {
  return useContext(NotificationsContext);
}
