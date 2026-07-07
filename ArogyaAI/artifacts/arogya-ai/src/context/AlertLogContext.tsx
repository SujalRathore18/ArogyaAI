import React, { createContext, useContext, useEffect, useState } from 'react';
import { apiFetch } from '../lib/api';

export interface Alert {
  id: number;
  locality: string;
  rule: string;
  detail: string;
  transcript: string;
  field: string;
  risk: string; // "red", "orange", "yellow", "blue"
  time: string;
}

interface ApiAlert {
  id: number;
  locality: string;
  rule: string;
  detail: string;
  transcript: string | null;
  field: string | null;
  risk: string;
  createdAt: string;
}

interface AlertLogContextType {
  alerts: Alert[];
  addAlert: (alert: Omit<Alert, 'id'>) => void;
}

const AlertLogContext = createContext<AlertLogContextType | null>(null);

function toAlert(a: ApiAlert): Alert {
  return {
    id: a.id,
    locality: a.locality,
    rule: a.rule,
    detail: a.detail,
    transcript: a.transcript ?? '',
    field: a.field ?? '',
    risk: a.risk,
    time: new Date(a.createdAt).toLocaleString(),
  };
}

export const AlertLogProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [alerts, setAlerts] = useState<Alert[]>([]);

  // Load real alerts from the backend on mount.
  useEffect(() => {
    apiFetch<{ alerts: ApiAlert[] }>('/alerts')
      .then(({ alerts }) => setAlerts(alerts.map(toAlert)))
      .catch(() => { /* if this fails, the dashboard just shows an empty log */ });
  }, []);

  const addAlert = (alert: Omit<Alert, 'id'>) => {
    // Optimistic local update so the UI reacts instantly...
    const tempId = Date.now();
    setAlerts(prev => [{ ...alert, id: tempId }, ...prev]);

    // ...then persist it for real, so it shows up for other sessions too.
    apiFetch<{ alert: ApiAlert }>('/alerts', {
      method: 'POST',
      body: JSON.stringify({
        locality: alert.locality,
        rule: alert.rule,
        detail: alert.detail,
        transcript: alert.transcript,
        field: alert.field,
        risk: alert.risk,
      }),
    })
      .then(({ alert: saved }) => {
        setAlerts(prev => prev.map(a => (a.id === tempId ? toAlert(saved) : a)));
      })
      .catch(() => { /* keep the optimistic local entry if the save fails */ });
  };

  return (
    <AlertLogContext.Provider value={{ alerts, addAlert }}>
      {children}
    </AlertLogContext.Provider>
  );
};

export const useAlertLog = () => {
  const ctx = useContext(AlertLogContext);
  if (!ctx) throw new Error('useAlertLog must be used within AlertLogProvider');
  return ctx;
};
