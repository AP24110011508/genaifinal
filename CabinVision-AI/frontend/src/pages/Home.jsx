import React from 'react';
import Hero from '../components/Hero';
import Features from '../components/Features';
import HowItWorks from '../components/HowItWorks';
import { Home as HomeIcon } from 'lucide-react';

export default function Home({ onNavigateWorkspace }) {
  return (
    <div className="w-full flex flex-col min-h-screen">
      {/* Hero Section */}
      <Hero onStartDesigning={onNavigateWorkspace} />

      {/* Features Highlights */}
      <Features />

      {/* How It Works Section */}
      <HowItWorks onStartDesigning={onNavigateWorkspace} />

      {/* Footer */}
      <footer className="py-12 bg-[#08090c] border-t border-[#1a1b24] text-xs text-[#8e8779]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-lg bg-[#c98a4b]/20 flex items-center justify-center text-[#e5ab6e]">
              <HomeIcon className="w-4 h-4" />
            </div>
            <div>
              <span className="font-['Space_Grotesk'] font-bold text-sm text-[#fbf9f5]">
                CabinVision AI
              </span>
              <p className="text-[11px] text-[#6e685c]">Transform Your Sketch into Reality</p>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <button
              type="button"
              onClick={onNavigateWorkspace}
              className="text-[#dcd5c9] hover:text-[#e5ab6e] transition-colors cursor-pointer"
            >
              Open Studio Workspace
            </button>
            <a
              href="#features"
              className="hover:text-[#fbf9f5] transition-colors"
            >
              Features
            </a>
            <a
              href="#how-it-works"
              className="hover:text-[#fbf9f5] transition-colors"
            >
              Methodology
            </a>
          </div>

          <div className="text-[11px] text-[#6e685c]">
            CabinVision AI &copy; 2026 • Sketch-to-Visualization Studio
          </div>
        </div>
      </footer>
    </div>
  );
}
