import React, { useEffect, useRef } from 'react';
import { INDORE_CENTER } from '../lib/health-logic';
import { useHospitals, useZones } from '../hooks/useApiData';

export const IndoreMap: React.FC = () => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<any>(null);
  const { data: hospitals = [] } = useHospitals();
  const { data: zones = [] } = useZones();

  useEffect(() => {
    if (typeof window === 'undefined' || !mapRef.current) return;
    if (hospitals.length === 0 && zones.length === 0) return;

    // Dynamic import to avoid SSR issues
    import('leaflet').then((L) => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current as HTMLDivElement).setView(INDORE_CENTER, 12);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      // Add hospital markers (Navy squares)
      hospitals.forEach(h => {
        const icon = L.divIcon({
          className: 'custom-icon',
          html: `<div style="background: hsl(186, 33%, 18%); width: 12px; height: 12px; transform: rotate(45deg); border: 1px solid white;"></div>`,
          iconSize: [12, 12],
          iconAnchor: [6, 6]
        });
        L.marker([h.lat, h.lng], { icon }).addTo(map).bindPopup(`<b>${h.name}</b><br>Beds: ${h.beds}`);
      });

      // Add locality circles
      zones.forEach(zone => {
        const color = zone.risk === 'red' ? '#B23A2E' : zone.risk === 'orange' ? '#E0952B' : '#3B8C5A';
        L.circle([zone.lat, zone.lng], {
          color,
          fillColor: color,
          fillOpacity: 0.5,
          radius: 800
        }).addTo(map).bindPopup(`<b>${zone.locality}</b><br>Risk: ${zone.risk}`);
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [hospitals, zones]);

  return (
    <div ref={mapRef} style={{ height: '340px', width: '100%', borderRadius: '0.5rem', zIndex: 0 }} className="border border-border shadow-sm relative z-0" />
  );
};
