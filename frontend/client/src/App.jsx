import { useState } from 'react';
import Navbar from './components/layout/Navbar';
import ScrollProgress from './components/layout/ScrollProgress';
import Footer from './components/layout/Footer';
import HeroSection from './components/hero/HeroSection';
import AboutJourneyReviewsSection from './components/about/AboutJourneyReviewsSection';
import ScrollytellingContainer from './components/scrollytelling/ScrollytellingContainer';
import LeadForm from './components/lead/LeadForm';
import ZoneDetailPanel from './components/zones/ZoneDetailPanel';

function App() {
  const [selectedZone, setSelectedZone] = useState(null);

  // Vercel Environment Variable controlled maintenance switch.
  // Set VITE_SITE_DISABLED="true" in Vercel settings to activate this screen.
  if (import.meta.env.VITE_SITE_DISABLED === "true") {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center" style={{ background: 'var(--bg-primary)' }}>
        <div className="max-w-md w-full space-y-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gray-100/10 mb-2">
            <svg className="w-8 h-8 opacity-80" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold tracking-tight">Website temporarily unavailable</h1>
          <p className="text-lg opacity-80">
            Please contact the administrator.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-primary)' }}>
      <ScrollProgress />
      <Navbar />

      <main>
        <HeroSection />
        <AboutJourneyReviewsSection />

        {/* Scrollytelling split-screen: Left=sticky train map, Right=zone slides */}
        <ScrollytellingContainer onExploreZone={(zoneId) => setSelectedZone(zoneId)} />

        <LeadForm />
      </main>

      <Footer />
      <ZoneDetailPanel selectedZone={selectedZone} onClose={() => setSelectedZone(null)} />
    </div>
  );
}

export default App;
