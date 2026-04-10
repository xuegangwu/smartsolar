import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { stationApi } from '../services/api';

interface Station {
  _id: string;
  name: string;
  type: string;
  location: { address: string; lat: number; lng: number };
  capacity: number;
  installedCapacity: number;
  peakPower: number;
  status: string;
  owner: string;
}

interface StationContextValue {
  stations: Station[];
  currentStation: Station | null;
  setCurrentStation: (s: Station | null) => void;
  loading: boolean;
  refresh: () => void;
}

const StationContext = createContext<StationContextValue>({
  stations: [],
  currentStation: null,
  setCurrentStation: () => {},
  loading: true,
  refresh: () => {},
});

export function StationProvider({ children }: { children: ReactNode }) {
  const [stations, setStations] = useState<Station[]>([]);
  const [currentStation, setCurrentStation] = useState<Station | null>(null);
  const [loading, setLoading] = useState(true);

  async function load() {
    const r = await stationApi.getAll();
    if (r.success) {
      setStations(r.data);
      // Auto-select first station with geo data, or first station
      const geo = r.data.filter((s: Station) => s.location?.lat && s.location?.lat !== 0);
      const toSelect = geo[0] || r.data[0] || null;
      setCurrentStation(toSelect);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  return (
    <StationContext.Provider value={{ stations, currentStation, setCurrentStation, loading, refresh: load }}>
      {children}
    </StationContext.Provider>
  );
}

export const useStation = () => useContext(StationContext);
