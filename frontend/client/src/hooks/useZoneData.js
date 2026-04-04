import { useState, useEffect } from 'react';
import api from '../utils/api';

export function useZoneData(zoneId = null) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!zoneId) {
      setData(null);
      return;
    }

    const fetchZone = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await api.get(`/zones/${zoneId}`);
        setData(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load zone data');
      } finally {
        setLoading(false);
      }
    };

    fetchZone();
  }, [zoneId]);

  return { data, loading, error };
}

export function useAllZones() {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const res = await api.get('/zones');
        setZones(res.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load zones');
      } finally {
        setLoading(false);
      }
    };

    fetchZones();
  }, []);

  return { zones, loading, error };
}
