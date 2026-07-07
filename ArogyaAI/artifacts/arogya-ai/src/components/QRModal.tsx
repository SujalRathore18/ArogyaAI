import React, { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { userProfile } from '../data/demo-content';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

interface QRModalProps {
  open: boolean;
  onClose: () => void;
}

export function QRModal({ open, onClose }: QRModalProps) {
  const { toast } = useToast();
  const [copied, setCopied] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // QR payload is a compact non-PII string; full data is displayed in the card below.
  // We keep the QR value minimal (ABHA ID + blood group only) so the QR itself
  // does not carry sensitive medical payload outside the device.
  const qrPayload = `AROGYA-SOS:${userProfile.abhaId}:${userProfile.bloodGroup}`;

  useEffect(() => {
    if (!open || !canvasRef.current) return;
    QRCode.toCanvas(canvasRef.current, qrPayload, {
      width: 160,
      margin: 2,
      color: { dark: '#1B2A22', light: '#F1F4EC' }
    }).catch(() => { /* canvas unavailable — silent fallback */ });
  }, [open, qrPayload]);

  if (!open) return null;

  const handleCopy = () => {
    const text = [
      `ArogyaAI Emergency Card`,
      `Name: ${userProfile.name}`,
      `Blood Group: ${userProfile.bloodGroup}`,
      `Allergies: ${userProfile.allergies.join(', ')}`,
      `Conditions: ${userProfile.chronicDiseases.join(', ')}`,
      `Emergency: ${userProfile.emergencyContacts[0].name} — ${userProfile.emergencyContacts[0].phone}`,
      `ABHA: ${userProfile.abhaId}`
    ].join('\n');
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    toast({ title: "Emergency card copied to clipboard" });
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-[#F1F4EC] rounded-2xl shadow-2xl max-w-sm w-full p-0 overflow-hidden border border-[#D3DBC5]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="bg-[#1F3A3D] text-white p-4 flex items-center justify-between">
          <div>
            <div className="text-xs font-mono text-white/60 uppercase tracking-widest">ArogyaAI</div>
            <div className="font-serif text-lg font-bold">Emergency Health Card</div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-xl leading-none">✕</button>
        </div>

        {/* QR + Identity */}
        <div className="p-5 flex gap-4 items-start border-b border-[#D3DBC5]">
          <div className="flex-shrink-0 w-[100px] h-[100px] bg-white rounded-xl border border-[#D3DBC5] overflow-hidden flex items-center justify-center">
            <canvas ref={canvasRef} className="w-full h-full" />
          </div>
          <div className="min-w-0">
            <div className="font-serif font-bold text-[#1B2A22] text-lg leading-tight">{userProfile.name}</div>
            <div className="text-xs text-[#4C5C50] font-mono mt-0.5">{userProfile.locality}</div>
            <div className="mt-2 flex items-center gap-2">
              <span className="bg-[#B23A2E] text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
                {userProfile.bloodGroup}
              </span>
              <span className="text-xs text-[#4C5C50]">Age {userProfile.age}</span>
            </div>
            <div className="text-[10px] font-mono text-[#4C5C50] mt-1.5">ABHA: {userProfile.abhaId}</div>
          </div>
        </div>

        {/* Health Data */}
        <div className="p-5 space-y-4">
          <Row icon="🚫" label="Allergies" items={userProfile.allergies} color="#B23A2E" />
          <Row icon="💊" label="Chronic Conditions" items={userProfile.chronicDiseases} color="#C77B18" />

          <div>
            <div className="text-[10px] font-mono text-[#4C5C50] uppercase tracking-widest mb-2 flex items-center gap-1">
              <span>📞</span> Emergency Contacts
            </div>
            {userProfile.emergencyContacts.map((c, i) => (
              <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 mb-1.5 border border-[#D3DBC5]">
                <span className="text-sm font-medium text-[#1B2A22]">{c.name}</span>
                <a href={`tel:${c.phone}`} className="text-xs font-mono text-[#3B8C5A] font-bold">{c.phone}</a>
              </div>
            ))}
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 pt-0 flex gap-2">
          <Button
            className="flex-1 bg-[#3B8C5A] hover:bg-[#2e6e46] text-white text-sm"
            onClick={handleCopy}
          >
            {copied ? "✓ Copied!" : "📋 Copy Card"}
          </Button>
          <Button
            variant="outline"
            className="flex-1 text-sm border-[#D3DBC5]"
            onClick={() => window.print()}
          >
            🖨 Print
          </Button>
        </div>
      </div>
    </div>
  );
}

function Row({ icon, label, items, color }: { icon: string; label: string; items: string[]; color: string }) {
  return (
    <div>
      <div className="text-[10px] font-mono text-[#4C5C50] uppercase tracking-widest mb-1.5 flex items-center gap-1">
        <span>{icon}</span> {label}
      </div>
      <div className="flex flex-wrap gap-1.5">
        {items.map((item, i) => (
          <span key={i} className="text-xs font-medium px-2.5 py-0.5 rounded-full border" style={{ borderColor: color + '40', color, background: color + '12' }}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}
