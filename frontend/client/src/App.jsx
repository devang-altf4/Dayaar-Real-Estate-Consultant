import { useState } from 'react';
import Navbar from './components/layout/Navbar';
import ScrollProgress from './components/layout/ScrollProgress';
import Footer from './components/layout/Footer';
import HeroSection from './components/hero/HeroSection';
import AboutJourneyReviewsSection from './components/about/AboutJourneyReviewsSection';
import ScrollytellingContainer from './components/scrollytelling/ScrollytellingContainer';
import LeadForm from './components/lead/LeadForm';
import ZoneDetailPanel from './components/zones/ZoneDetailPanel';
import ChatbotWidget from './components/chatbot/ChatbotWidget';

function App() {
  const [selectedZone, setSelectedZone] = useState(null);

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
      <ChatbotWidget />
    </div>
  );
}

export default App;
