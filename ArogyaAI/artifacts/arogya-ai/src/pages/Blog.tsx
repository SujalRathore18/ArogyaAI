import React from 'react';
import { useLang } from '../context/LangContext';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function Blog() {
  const { t, lang } = useLang();

  const articles = [
    { title: "Dengue Fever Guidance", hiTitle: "डेंगू बुखार मार्गदर्शन", risk: "Yellow", content: "Dengue is spreading in specific zones. Clear stagnant water. Use mosquito nets. If fever persists over 3 days with joint pain, report immediately." },
    { title: "Heat Stroke Prevention", hiTitle: "लू से बचाव", risk: "Green", content: "Stay hydrated. Avoid direct sunlight between 12 PM - 4 PM. ORS packets are fully stocked at all PHCs." },
    { title: "Snake Bite Emergency Protocol", hiTitle: "सांप काटने पर आपातकालीन प्रोटोकॉल", risk: "Red", content: "Do NOT cut or suck the wound. Keep patient calm and immobile. Use Vaani to immediately find nearest trauma center with anti-venom." },
    { title: "Chest Pain: When to Call 108", hiTitle: "सीने में दर्द: 108 पर कब कॉल करें", risk: "Red", content: "If pain radiates to arm/jaw, or is accompanied by breathlessness, call 108 instantly. Time is muscle." },
    { title: "Managing Typhoid at Home", hiTitle: "घर पर टाइफाइड का प्रबंधन", risk: "Yellow", content: "Complete the full antibiotic course prescribed by your PHC doctor. Boil water before drinking." },
    { title: "Malaria Symptoms Checklist", hiTitle: "मलेरिया के लक्षणों की जांच सूची", risk: "Yellow", content: "Chills, high fever, sweating. Free rapid testing available at all government health centers." }
  ];

  return (
    <div className="min-h-screen bg-background py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="font-serif text-4xl font-bold mb-2">{t('nav.blog')}</h1>
        <p className="text-muted-foreground mb-12">Verified guidance for common conditions in Indore district.</p>

        <div className="grid md:grid-cols-2 gap-6">
          {articles.map((article, i) => (
            <Card key={i} className="hover-elevate cursor-pointer border-border shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start mb-2">
                  <Badge variant="outline" className={`
                    ${article.risk === 'Red' ? 'border-destructive text-destructive' : 
                      article.risk === 'Yellow' ? 'border-accent text-accent' : 
                      'border-[#3B8C5A] text-[#3B8C5A]'}
                  `}>
                    {article.risk} Risk
                  </Badge>
                </div>
                <CardTitle className={`font-serif text-xl ${lang === 'hi' ? 'font-hindi' : ''}`}>
                  {lang === 'hi' ? article.hiTitle : article.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground text-sm leading-relaxed">
                  {article.content}
                </p>
                <div className="mt-4 text-primary text-sm font-medium">Read more &rarr;</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
