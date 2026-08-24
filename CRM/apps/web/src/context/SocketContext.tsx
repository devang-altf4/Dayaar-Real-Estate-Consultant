'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext';
import { api } from '@/lib/api';
import { CallAttemptStatus, DeviceStatus } from '@dayaar/shared';

interface ActiveCallState {
  isActive: boolean;
  leadId: string;
  leadName?: string;
  phoneNumber?: string;
  commandId?: string;
  callAttemptId?: string;
  status: CallAttemptStatus;
  durationSeconds: number;
}

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  deviceStatus: {
    status: DeviceStatus;
    deviceName?: string;
    isSimReady?: boolean;
    lastSeenAt?: string | Date;
  };
  activeCall: ActiveCallState | null;
  setActiveCall: React.Dispatch<React.SetStateAction<ActiveCallState | null>>;
  updateDeviceStatus: (status: any) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [deviceStatus, setDeviceStatus] = useState<{
    status: DeviceStatus;
    deviceName?: string;
    isSimReady?: boolean;
    lastSeenAt?: string | Date;
  }>({ status: DeviceStatus.OFFLINE });

  const [activeCall, setActiveCall] = useState<ActiveCallState | null>(null);

  useEffect(() => {
    setIsConnected(false);
    setDeviceStatus({ status: DeviceStatus.OFFLINE });
    setActiveCall(null);

    if (!user) {
      setSocket((current) => {
        current?.disconnect();
        return null;
      });
      return;
    }

    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';
    const token = localStorage.getItem('dayaar_access_token');
    if (!token) return;

    let cancelled = false;
    void api.get<any>('/devices/my-device').then((device) => {
      if (cancelled) return;
      if (!device) {
        setDeviceStatus({ status: DeviceStatus.OFFLINE });
        return;
      }
      setDeviceStatus({
        status: device.status || DeviceStatus.OFFLINE,
        deviceName: device.deviceName,
        isSimReady: device.isSimReady ?? device.simState === 'READY',
        lastSeenAt: device.lastSeenAt,
      });
    }).catch(() => {
      // Socket events will continue to provide live status if initial hydration fails.
    });

    const s = io(wsUrl, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });

    s.on('connect', () => {
      setIsConnected(true);
    });

    s.on('disconnect', () => {
      setIsConnected(false);
    });

    s.on('DEVICE_STATUS_CHANGED', (data: any) => {
      setDeviceStatus((prev) => ({
        ...prev,
        status: data.status || DeviceStatus.ONLINE,
        deviceName: data.deviceName || prev.deviceName,
        isSimReady: data.simState === 'READY' || data.isSimReady,
        lastSeenAt: data.lastSeenAt || new Date(),
      }));
    });

    s.on('CALL_STATUS_UPDATE', (data: any) => {
      setActiveCall((prev) => {
        if (!prev && data.status !== CallAttemptStatus.NOT_CONNECTED && data.status !== CallAttemptStatus.FAILED) {
          return {
            isActive: true,
            leadId: data.leadId || '',
            callAttemptId: data.callAttemptId,
            commandId: data.commandId,
            status: data.status,
            durationSeconds: data.durationSeconds || 0,
          };
        }
        if (prev) {
          return {
            ...prev,
            status: data.status,
            durationSeconds: data.durationSeconds !== undefined ? data.durationSeconds : prev.durationSeconds,
          };
        }
        return null;
      });
    });

    setSocket(s);

    return () => {
      cancelled = true;
      s.disconnect();
      setSocket((current) => (current === s ? null : current));
      setIsConnected(false);
    };
  }, [user]);

  const updateDeviceStatus = (status: any) => {
    setDeviceStatus((prev) => ({ ...prev, ...status }));
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        deviceStatus,
        activeCall,
        setActiveCall,
        updateDeviceStatus,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
