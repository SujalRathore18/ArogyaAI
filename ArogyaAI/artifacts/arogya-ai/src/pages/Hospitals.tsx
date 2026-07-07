import React from 'react';
import { useLang } from '../context/LangContext';
import { useHospitals, useMedicines, useDoctors } from '../hooks/useApiData';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function Hospitals() {
  const { t } = useLang();
  const { data: hospitals = [], isLoading: hospitalsLoading } = useHospitals();
  const { data: medicines = [], isLoading: medicinesLoading } = useMedicines();
  const { data: doctors = [], isLoading: doctorsLoading } = useDoctors();

  const isLoading = hospitalsLoading || medicinesLoading || doctorsLoading;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground font-mono">
        Loading live network data…
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-6xl mx-auto space-y-12">
        
        <div>
          <h1 className="font-serif text-4xl font-bold mb-2">{t('nav.hospitals')}</h1>
          <p className="text-muted-foreground">Live availability of doctors and facilities in Indore network.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          
          {/* Doctors List */}
          <div className="space-y-6">
            <h2 className="font-serif text-2xl font-bold border-b border-border pb-2">Doctors on Duty Today</h2>
            <div className="space-y-4">
              {doctors.map((doc) => (
                <Card key={doc.id} className="shadow-none border-border">
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center font-bold text-muted-foreground">
                        {doc.name.substring(4, 5)}
                      </div>
                      <div>
                        <div className="font-bold text-foreground">{doc.name}</div>
                        <div className="text-xs text-muted-foreground">{doc.specialty} • {doc.phc}</div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end">
                      <div className="flex items-center gap-1 text-sm font-medium">
                        <div className={`w-2 h-2 rounded-full ${doc.present ? 'bg-[#3B8C5A]' : 'bg-muted-foreground'}`}></div>
                        {doc.present ? 'Available' : 'Off Duty'}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Meds */}
          <div className="space-y-6">
            <h2 className="font-serif text-2xl font-bold border-b border-border pb-2">Medicine Stock (PHCs)</h2>
            <div className="grid grid-cols-1 gap-4">
              {medicines.map((m) => {
                const daysLeft = m.stock / m.burnRate;
                const isCritical = daysLeft < 3;
                return (
                  <Card key={m.id} className={`shadow-none border ${isCritical ? 'border-destructive/30 bg-destructive/5' : 'border-border'}`}>
                    <CardContent className="p-4 flex items-center justify-between">
                      <div>
                        <div className="font-bold">{m.name}</div>
                        <div className="text-xs text-muted-foreground">{m.phc}</div>
                      </div>
                      <div className="text-right">
                        <div className={`font-mono font-bold text-lg ${isCritical ? 'text-destructive' : 'text-foreground'}`}>
                          {m.stock} <span className="text-xs text-muted-foreground font-sans">units</span>
                        </div>
                        <div className="text-xs text-muted-foreground">Est. {daysLeft.toFixed(0)} days left</div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </div>

        </div>

        {/* Hospital Directory */}
        <div className="space-y-6 pt-8">
          <h2 className="font-serif text-2xl font-bold border-b border-border pb-2">Full Hospital Directory</h2>
          <div className="grid md:grid-cols-3 gap-6">
            {hospitals.map((h) => (
              <Card key={h.id} className="shadow-sm border-border hover-elevate">
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <CardTitle className="font-serif text-lg">{h.name}</CardTitle>
                    <div className="text-primary font-bold text-sm">★ {h.reviews}</div>
                  </div>
                  <div className="text-xs text-muted-foreground">{h.specialties.join(' • ')}</div>
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-end mt-4">
                    <div className="flex gap-1">
                      {h.icu && <Badge variant="secondary" className="text-[10px]">ICU</Badge>}
                      {h.trauma && <Badge variant="destructive" className="text-[10px]">Trauma</Badge>}
                    </div>
                    <div className="text-right">
                      <div className="font-mono text-2xl font-bold text-[#3B8C5A]">{h.beds}</div>
                      <div className="text-[10px] text-muted-foreground uppercase">Free Beds</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
