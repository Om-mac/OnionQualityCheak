import React, { useEffect } from 'react';
import Nav from '../components/home/Nav';
import Hero from '../components/home/Hero';
import TrustStrip from '../components/home/TrustStrip';
import Problem from '../components/home/Problem';
import Innovation from '../components/home/Innovation';
import Fusion from '../components/home/Fusion';
import HowItWorks from '../components/home/HowItWorks';
import Report from '../components/home/Report';
import Analytics from '../components/home/Analytics';
import CTA from '../components/home/CTA';
import Footer from '../components/home/Footer';

export default function Home() {
  // Each visit starts at the top so the hero reveal always plays cleanly.
  useEffect(() => {
    window.scrollTo(0, 0);
    document.title = 'OnionSure — Smarter Onion Grading, Fairer Quality Decisions';
  }, []);

  return (
    <div className="min-h-screen bg-white font-sans antialiased">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[70] focus:rounded-lg focus:bg-orange-500 focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-white"
      >
        Skip to content
      </a>

      <Nav />

      <main id="main">
        <Hero />
        <TrustStrip />
        <Problem />
        <Innovation />
        <Fusion />
        <HowItWorks />
        <Report />
        <Analytics />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}
