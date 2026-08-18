'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { io } from 'socket.io-client';
import {
  Smartphone,
  Phone,
  PhoneOff,
  Signal,
  Wifi,
  Battery,
  ShieldCheck,
  RefreshCw,
  Play,
  Upload,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { SimState, CallAttemptStatus } from '@dayaar/shared';

export default function DeviceSimulatorPage() {
  const [pairingCode, setPairingCode] = useState('');
  const [pairingToken, setPairingToken] = useState('');
  const [deviceAuthToken, setDeviceAuthToken] = useState('');
  const [deviceId] = useState('android_sim_dev_' + Math.floor(1000 + Math.random() * 9000));
  const [isPaired, setIsPaired] = useState(false);
  const [simState, setSimState] = useState<SimState>(SimState.READY);
  const [simOperator, setSimOperator] = useState('Airtel 5G Corporate');
  const [batteryLevel, setBatteryLevel] = useState(88);

  const [activeCallCommand, setActiveCallCommand] = useState<any>(null);
  const [callState, setCallState] = useState<'IDLE' | 'DIALING' | 'CONNECTED' | 'ENDED'>('IDLE');
  const [callDuration, setCallDuration] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [message, setMessage] = useState('');

  const addLog = (msg: string) => {
    setLogs((prev) => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev.slice(0, 20)]);
  };

  useEffect(() => {
    setPairingCode(sessionStorage.getItem('dayaar_dev_pairing_code') || '');
    setPairingToken(sessionStorage.getItem('dayaar_dev_pairing_token') || '');
  }, []);

  const deviceHeaders: Record<string, string> = deviceAuthToken
    ? { 'x-device-id': deviceId, 'x-device-token': deviceAuthToken }
    : {};

  // Claim Pairing
  const handlePair = async () => {
    setMessage('');
    try {
      const res: any = await api.post('/devices/pair', {
        pairingCode,
        pairingToken,
        deviceId,
        deviceName: `Pixel 8 Pro (SIM Dev)`,
        manufacturer: 'Google',
        model: 'Pixel 8 Pro',
        appVersion: '1.0.0',
        simState,
        simOperator,
        capabilities: {
          canPlaceCalls: true,
          canReadCallLogs: true,
          canSyncRecordings: true,
        },
      });

      setDeviceAuthToken(res.deviceAuthToken);
      sessionStorage.removeItem('dayaar_dev_pairing_code');
      sessionStorage.removeItem('dayaar_dev_pairing_token');
      setIsPaired(true);
      addLog(`Device paired successfully as ${res.deviceName}`);
    } catch (err: any) {
      setMessage(err.message || 'Failed to claim pairing');
      addLog(`Pairing failed: ${err.message}`);
    }
  };

  // Heartbeat sender
  useEffect(() => {
    if (!isPaired) return;
    const interval = setInterval(async () => {
      try {
        await api.post(
          '/devices/heartbeat',
          {
            deviceId,
            simState,
            simOperator,
            batteryLevel,
          },
          deviceHeaders,
        );
        addLog('Sent background heartbeat: Device ONLINE & SIM READY');
      } catch (err: any) {
        addLog(`Heartbeat error: ${err.message}`);
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [isPaired, deviceId, simState, simOperator, batteryLevel, deviceAuthToken]);

  // Socket listener for incoming call commands
  useEffect(() => {
    if (!isPaired || !deviceAuthToken) return;

    const deviceSocket = io(
      process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000',
      {
        auth: { deviceId, deviceToken: deviceAuthToken },
        transports: ['websocket', 'polling'],
      },
    );

    deviceSocket.on('INCOMING_CALL_COMMAND', (command: any) => {
      addLog(`RECEIVED CALL COMMAND for phone: ${command.phoneNumber}`);
      setActiveCallCommand(command);
      setCallState('DIALING');
      setCallDuration(0);
    });

    return () => {
      deviceSocket.disconnect();
    };
  }, [isPaired, deviceAuthToken, deviceId]);

  // Duration ticker
  useEffect(() => {
    let interval: any = null;
    if (callState === 'CONNECTED') {
      interval = setInterval(() => {
        setCallDuration((prev) => prev + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [callState]);

  const handleSimulateConnected = async () => {
    if (!activeCallCommand) return;
    setCallState('CONNECTED');
    addLog(`Customer answered! Call Connected.`);
    await api.post(
      '/calls/status',
      {
        commandId: activeCallCommand.commandId,
        callAttemptId: activeCallCommand.callAttemptId,
        status: CallAttemptStatus.CONNECTED,
        durationSeconds: 0,
      },
      deviceHeaders,
    );
  };

  const handleSimulateEndCall = async () => {
    if (!activeCallCommand) return;
    setCallState('ENDED');
    addLog(`Call Ended. Duration: ${callDuration}s`);

    await api.post(
      '/calls/complete',
      {
        callAttemptId: activeCallCommand.callAttemptId,
        status: CallAttemptStatus.CONNECTED,
        rawStatus: 'CONNECTED',
        durationSeconds: callDuration,
        hasRecording: true,
      },
      deviceHeaders,
    );

    // Simulate audio upload
    const formData = new FormData();
    const blob = new Blob(['RIFF....WAVEfmt ....data....'], { type: 'audio/wav' });
    formData.append('file', blob, 'recording.wav');

    try {
      await api.post(
        `/calls/${activeCallCommand.callAttemptId}/recording-upload`,
        formData,
        deviceHeaders,
      );
      addLog('Uploaded simulated call audio recording to storage');
    } catch (e) {}

    setTimeout(() => {
      setActiveCallCommand(null);
      setCallState('IDLE');
    }, 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Dev Android Calling Simulator</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Simulates an Android company phone running the background telephony daemon
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Smartphone Simulator Mockup */}
        <div className="flex justify-center">
          <div className="w-[320px] h-[640px] bg-slate-950 rounded-[45px] p-3.5 shadow-2xl border-4 border-slate-800 flex flex-col justify-between relative overflow-hidden">
            {/* Speaker & Camera Notch */}
            <div className="absolute top-4 left-1/2 -translate-x-1/2 h-5 w-24 bg-slate-900 rounded-full flex items-center justify-center gap-2 z-20">
              <div className="h-2 w-2 rounded-full bg-slate-800" />
              <div className="h-1.5 w-10 rounded-full bg-slate-800" />
            </div>

            {/* Android Screen */}
            <div className="w-full h-full bg-slate-900 rounded-[35px] overflow-hidden flex flex-col justify-between text-white p-4 pt-7">
              {/* Status Bar */}
              <div className="flex justify-between items-center text-[10px] text-slate-400">
                <span className="font-semibold">{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                <div className="flex items-center gap-1.5">
                  <Signal className="h-3 w-3 text-emerald-400" />
                  <Wifi className="h-3 w-3 text-slate-300" />
                  <Battery className="h-3 w-3 text-slate-300" />
                  <span>{batteryLevel}%</span>
                </div>
              </div>

              {/* Main App Content */}
              {!isPaired ? (
                <div className="space-y-4 my-auto text-center px-2">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-600/20 text-sky-400 mx-auto">
                    <Smartphone className="h-6 w-6" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Dayaar Phone Agent</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Enter 6-digit CRM Pairing PIN</p>
                  </div>

                  <input
                    type="text"
                    maxLength={6}
                    placeholder="e.g. 849201"
                    value={pairingCode}
                    onChange={(e) => setPairingCode(e.target.value)}
                    className="w-full text-center font-mono font-bold tracking-widest text-lg p-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
                  />

                  <input
                    type="password"
                    placeholder="Secure pairing token"
                    value={pairingToken}
                    onChange={(e) => setPairingToken(e.target.value)}
                    className="w-full text-center font-mono text-[10px] p-2 bg-slate-800 border border-slate-700 rounded-xl text-white focus:outline-none focus:border-sky-500"
                  />

                  <button
                    type="button"
                    onClick={handlePair}
                    className="w-full py-2 bg-sky-600 hover:bg-sky-500 rounded-xl text-xs font-bold transition-colors"
                  >
                    Pair Device
                  </button>
                </div>
              ) : callState === 'IDLE' ? (
                <div className="space-y-4 my-auto text-center">
                  <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-400 mx-auto">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Telephony Daemon Active</h4>
                    <p className="text-[10px] text-slate-400 mt-1 font-mono">SIM: {simOperator}</p>
                    <span className="inline-block mt-2 px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-400">
                      WAITING FOR CRM CALL COMMAND
                    </span>
                  </div>
                </div>
              ) : (
                /* In-Call Active Phone UI */
                <div className="space-y-6 my-auto text-center animate-in fade-in">
                  <div>
                    <div className="h-16 w-16 rounded-full bg-sky-600/30 text-sky-400 flex items-center justify-center mx-auto mb-2">
                      <Phone className={`h-8 w-8 ${callState === 'DIALING' ? 'animate-bounce' : ''}`} />
                    </div>
                    <h4 className="font-bold text-base">{activeCallCommand?.leadName || 'Customer'}</h4>
                    <p className="text-xs font-mono text-slate-400">{activeCallCommand?.phoneNumber}</p>
                  </div>

                  <div className="text-sm font-mono font-bold text-sky-400">
                    {callState === 'DIALING' ? 'Dialing via SIM 1...' : `Connected (00:${callDuration.toString().padStart(2, '0')})`}
                  </div>

                  <div className="flex justify-center gap-4 pt-4">
                    {callState === 'DIALING' ? (
                      <button
                        type="button"
                        onClick={handleSimulateConnected}
                        className="p-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-full shadow-lg"
                        title="Simulate Customer Answer"
                      >
                        <Phone className="h-5 w-5" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleSimulateEndCall}
                        className="p-3.5 bg-rose-600 hover:bg-rose-500 text-white rounded-full shadow-lg"
                        title="End Call"
                      >
                        <PhoneOff className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                </div>
              )}

              {/* Bottom Home Indicator */}
              <div className="h-1 w-20 bg-slate-700 rounded-full mx-auto" />
            </div>
          </div>
        </div>

        {/* Diagnostic Logs & Controls */}
        <div className="lg:col-span-2 space-y-5">
          <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Simulator Parameters</h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">Simulated SIM State</label>
                <select
                  value={simState}
                  onChange={(e) => setSimState(e.target.value as SimState)}
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value={SimState.READY}>READY (Healthy)</option>
                  <option value={SimState.ABSENT}>ABSENT (No SIM)</option>
                  <option value={SimState.LOCKED}>LOCKED (PIN required)</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">SIM Operator Name</label>
                <input
                  type="text"
                  value={simOperator}
                  onChange={(e) => setSimOperator(e.target.value)}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Battery Level (%)</label>
                <input
                  type="number"
                  value={batteryLevel}
                  onChange={(e) => setBatteryLevel(Number(e.target.value))}
                  className="w-full p-2 border border-slate-300 rounded-lg"
                />
              </div>
            </div>
          </div>

          {/* Real-time Telephony Logs */}
          <div className="p-6 bg-slate-900 text-slate-100 rounded-2xl shadow-xs space-y-3 font-mono text-xs">
            <div className="flex items-center justify-between text-slate-400 border-b border-slate-800 pb-2">
              <span className="font-bold uppercase tracking-wider">Device Agent Console Stream</span>
              <span className="text-[10px] text-emerald-400">● LIVE</span>
            </div>

            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {logs.length === 0 ? (
                <div className="text-slate-600 italic">No events logged yet. Pair device or place a call from Web CRM.</div>
              ) : (
                logs.map((log, idx) => (
                  <div key={idx} className="leading-relaxed">
                    {log}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
