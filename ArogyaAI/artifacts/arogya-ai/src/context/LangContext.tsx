import React, { createContext, useContext, useState } from 'react';

type Lang = 'en' | 'hi';

interface Translations {
  [key: string]: { en: string; hi: string };
}

const translations: Translations = {
  // Nav
  "nav.blog": { en: "📰 Patient Blog", hi: "📰 मरीज ब्लॉग" },
  "nav.hospitals": { en: "🏥 Hospitals & Doctors", hi: "🏥 अस्पताल और डॉक्टर" },
  "nav.login": { en: "Login", hi: "लॉग इन" },
  "nav.logout": { en: "Logout", hi: "लॉग आउट" },
  "nav.tagline": { en: "Every call is a heartbeat we're listening to", hi: "हर कॉल एक धड़कन है जिसे हम सुन रहे हैं" },

  // Home Hero
  "home.eyebrow": { en: "Build with AI · Code for Communities · Track 3, Smart Health", hi: "एआई के साथ निर्माण · समुदायों के लिए कोड · ट्रैक 3, स्मार्ट हेल्थ" },
  "home.h1": { en: "One pipeline, from a village phone call to a district that acts on it.", hi: "एक पाइपलाइन, गाँव की फोन कॉल से लेकर जिले की कार्रवाई तक।" },
  "home.sub": { en: "ArogyaAI turns voice reports from ASHA workers and patients into live medicine-stock alerts, risk-classified emergencies, and one weekly brief an MP's office can act on — in Hindi or English, by voice or text.", hi: "आरोग्य एआई आशा कार्यकर्ताओं और मरीजों की आवाज़ की रिपोर्ट को दवा के स्टॉक अलर्ट, जोखिम-वर्गीकृत आपात स्थितियों और एक साप्ताहिक रिपोर्ट में बदल देता है जिस पर सांसद कार्यालय कार्रवाई कर सकता है।" },
  
  // Home cards
  "home.card.patient": { en: "Patient / ASHA Portal", hi: "मरीज / आशा पोर्टल" },
  "home.card.mgmt": { en: "District Management Console", hi: "जिला प्रबंधन कंसोल" },
  "home.trust": { en: "Prototype Note: Data shown is simulated. Real implementation connects to state health DB.", hi: "प्रोटोटाइप नोट: दिखाया गया डेटा सिम्युलेटेड है। असली सिस्टम राज्य स्वास्थ्य डेटाबेस से जुड़ता है।" },
  
  // Patient Portal
  "patient.vaani": { en: "Hindi AI Health Agent — Vaani", hi: "हिंदी एआई हेल्थ एजेंट — वाणी" },
  "patient.play": { en: "Play / Sunein", hi: "प्ले / सुनें" },
  "patient.place_call": { en: "📞 Place the call", hi: "📞 कॉल करें" },
  "patient.risk_chart": { en: "AI Risk Chart", hi: "एआई जोखिम चार्ट" },
  "patient.placeholder": { en: "Describe symptoms...", hi: "लक्षण बताएं..." },

  // Scenario Buttons
  "scenario.1": { en: "🫁 Breathlessness", hi: "🫁 सांस लेने में तकलीफ" },
  "scenario.2": { en: "🤒 High Fever Child", hi: "🤒 बच्चे को तेज बुखार" },
  "scenario.3": { en: "🐍 Snake Bite", hi: "🐍 सांप का काटना" },
  "scenario.4": { en: "💊 Medicine Stockout", hi: "💊 दवा खत्म होना" }
};

interface LangContextType {
  lang: Lang;
  toggleLang: () => void;
  t: (key: string) => string;
}

const LangContext = createContext<LangContextType | null>(null);

export const LangProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [lang, setLang] = useState<Lang>('en');

  const toggleLang = () => setLang(l => l === 'en' ? 'hi' : 'en');
  
  const t = (key: string) => {
    return translations[key]?.[lang] || key;
  };

  return (
    <LangContext.Provider value={{ lang, toggleLang, t }}>
      {children}
    </LangContext.Provider>
  );
};

export const useLang = () => {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error('useLang must be used within LangProvider');
  return ctx;
};
