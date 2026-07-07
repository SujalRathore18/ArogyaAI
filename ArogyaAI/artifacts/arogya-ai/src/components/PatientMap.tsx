import React, { useEffect, useRef } from 'react';

export interface MapHospital {
  name: string;
  lat: number;
  lng: number;
  dist: number;
  score: number;
  icu: boolean;
  trauma: boolean;
}

interface PatientMapProps {
  patientCoords: [number, number];
  hospitals: MapHospital[];   // first = best, second = runner-up
  risk: string;
  height?: string;
}

export const PatientMap: React.FC<PatientMapProps> = ({
  patientCoords, hospitals, risk, height = '220px',
}) => {
  const mapRef     = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<unknown>(null);

  const riskBorder =
    risk === 'RED' ? '#B23A2E' : risk === 'YELLOW' ? '#C77B18' : '#3B8C5A';

  useEffect(() => {
    if (!mapRef.current) return;
    let cancelled = false;

    import('leaflet').then((L) => {
      if (cancelled || instanceRef.current || !mapRef.current) return;

      const map = L.map(mapRef.current as HTMLDivElement, {
        zoomControl: true,
        scrollWheelZoom: false,
        attributionControl: false,
      });
      instanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

      // Patient marker — pulsing circle
      const pulseHtml = `
        <div style="position:relative;width:22px;height:22px">
          <div style="width:14px;height:14px;background:${riskBorder};border-radius:50%;border:2px solid white;
            position:absolute;top:4px;left:4px;box-shadow:0 0 0 0 ${riskBorder}88;
            animation:pulse-map 1.4s infinite"></div>
        </div>
        <style>
          @keyframes pulse-map{0%{box-shadow:0 0 0 0 ${riskBorder}88}70%{box-shadow:0 0 0 10px ${riskBorder}00}100%{box-shadow:0 0 0 0 ${riskBorder}00}}
        </style>`;

      const patientIcon = L.divIcon({
        className: '', html: pulseHtml,
        iconSize: [22, 22], iconAnchor: [11, 11],
      });
      L.marker(patientCoords, { icon: patientIcon })
        .addTo(map)
        .bindPopup('<b>📍 Your Location</b>');

      // Hospital markers — numbered pins
      const colors = ['#B23A2E', '#C77B18', '#3B8C5A'];
      hospitals.slice(0, 3).forEach((h, i) => {
        const pinHtml = `<div style="
          background:${colors[i] ?? '#1F3A3D'};color:white;font-weight:bold;font-size:11px;
          width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);
          display:flex;align-items:center;justify-content:center;border:2px solid white;
          box-shadow:0 2px 6px rgba(0,0,0,.35)">
          <span style="transform:rotate(45deg)">${i + 1}</span>
        </div>`;
        const icon = L.divIcon({
          className: '', html: pinHtml,
          iconSize: [24, 24], iconAnchor: [12, 24],
        });
        const popup = `<b>${h.name}</b><br>${h.dist.toFixed(1)} km away<br>
          ICU: ${h.icu ? '✅' : '—'} · Trauma: ${h.trauma ? '✅' : '—'}`;
        L.marker([h.lat, h.lng], { icon }).addTo(map).bindPopup(popup);
      });

      // Fit bounds to patient + top hospital
      const points: [number, number][] = [patientCoords];
      hospitals.slice(0, 2).forEach(h => points.push([h.lat, h.lng]));
      map.fitBounds(L.latLngBounds(points), { padding: [30, 30], maxZoom: 14 });

      // Invalidate size after a tick (card may not be fully laid out yet)
      setTimeout(() => { (map as { invalidateSize: () => void }).invalidateSize(); }, 150);
    });

    return () => {
      cancelled = true;
      if (instanceRef.current) {
        (instanceRef.current as { remove: () => void }).remove();
        instanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mapRef}
      style={{ height, width: '100%', borderRadius: '0.75rem', zIndex: 0, border: `1.5px solid ${riskBorder}44` }}
      className="shadow-sm relative z-0 overflow-hidden"
    />
  );
};
