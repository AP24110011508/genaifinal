import React, { useState } from 'react';
import { Home, Sparkles, Compass, Menu, X, ArrowRight } from 'lucide-react';

export default function Navbar({ activeTab, onTabChange }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleNav = (tab, hash) => {
    onTabChange(tab);
    setMobileMenuOpen(false);
    if (hash && tab === 'home') {
      setTimeout(() => {
        const elem = document.querySelector(hash);
        if (elem) elem.scrollIntoView({ behavior: 'smooth' });
      }, 50);
    }
  };

  return (
    <header className="sticky top-0 z-50 backdrop-blur-md bg-[#0c0d11]/85 border-b border-[#232530] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          
          {/* Brand Logo & Title */}
          <div 
            onClick={() => handleNav('home')}
            className="flex items-center gap-3.5 cursor-pointer group select-none"
          >
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#c98a4b] via-[#a36830] to-[#5a3313] p-[1.5px] shadow-lg shadow-[#c98a4b]/15 group-hover:shadow-[#c98a4b]/30 transition-all duration-300">
              <div className="w-full h-full bg-[#121319] rounded-[10px] flex items-center justify-center">
                <Home className="w-5 h-5 text-[#e5ab6e] group-hover:scale-110 transition-transform duration-200" />
              </div>
            </div>
            
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <span className="font-['Space_Grotesk'] text-xl font-bold tracking-tight text-[#fbf9f5] group-hover:text-[#e5ab6e] transition-colors">
                  CabinVision<span className="text-[#c98a4b] font-medium ml-0.5">AI</span>
                </span>
                <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold tracking-wider uppercase bg-[#c98a4b]/15 text-[#e5ab6e] border border-[#c98a4b]/30">
                  Studio
                </span>
              </div>
              <span className="text-[11px] text-[#9a9386] tracking-wide font-normal">
                Transform Your Sketch into Reality
              </span>
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-1 lg:gap-2">
            <button
              type="button"
              onClick={() => handleNav('home')}
              className={`px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'home'
                  ? 'text-[#fbf9f5] bg-[#1a1c25] border border-[#2e3140]'
                  : 'text-[#a79f91] hover:text-[#fbf9f5] hover:bg-[#151720]'
              }`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => handleNav('home', '#features')}
              className="px-3.5 py-2 text-sm font-medium text-[#a79f91] hover:text-[#fbf9f5] hover:bg-[#151720] rounded-lg transition-all"
            >
              Features
            </button>
            <button
              type="button"
              onClick={() => handleNav('home', '#how-it-works')}
              className="px-3.5 py-2 text-sm font-medium text-[#a79f91] hover:text-[#fbf9f5] hover:bg-[#151720] rounded-lg transition-all"
            >
              How It Works
            </button>
            <button
              type="button"
              onClick={() => handleNav('workspace')}
              className={`flex items-center gap-2 px-3.5 py-2 text-sm font-medium rounded-lg transition-all ${
                activeTab === 'workspace'
                  ? 'text-[#fbf9f5] bg-[#1a1c25] border border-[#c98a4b]/40 shadow-inner'
                  : 'text-[#a79f91] hover:text-[#fbf9f5] hover:bg-[#151720]'
              }`}
            >
              <Compass className="w-4 h-4 text-[#c98a4b]" />
              <span>Workspace</span>
            </button>
          </nav>

          {/* Action Button */}
          <div className="hidden md:flex items-center gap-3">
            <button
              type="button"
              onClick={() => handleNav('workspace')}
              className="relative inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-medium text-sm text-[#0c0d11] bg-gradient-to-r from-[#e5ab6e] via-[#d49352] to-[#c98a4b] hover:from-[#f0bc83] hover:to-[#db9957] shadow-md shadow-[#c98a4b]/20 hover:shadow-lg hover:shadow-[#c98a4b]/30 active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-[#1a1309]" />
              <span>Start Designing</span>
              <ArrowRight className="w-4 h-4 text-[#1a1309]" />
            </button>
          </div>

          {/* Mobile menu trigger */}
          <div className="flex md:hidden">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2.5 rounded-xl text-[#a79f91] hover:text-[#fbf9f5] bg-[#14161f] border border-[#232530]"
              aria-label="Toggle navigation menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden border-b border-[#232530] bg-[#0f1117] px-4 pt-3 pb-5 space-y-2 shadow-2xl">
          <button
            type="button"
            onClick={() => handleNav('home')}
            className={`w-full text-left px-4 py-3 rounded-xl text-sm font-medium ${
              activeTab === 'home' ? 'bg-[#1a1c26] text-[#fbf9f5] border border-[#2e3140]' : 'text-[#a79f91]'
            }`}
          >
            Overview
          </button>
          <button
            type="button"
            onClick={() => handleNav('home', '#features')}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-[#a79f91] hover:bg-[#161822]"
          >
            Features
          </button>
          <button
            type="button"
            onClick={() => handleNav('home', '#how-it-works')}
            className="w-full text-left px-4 py-3 rounded-xl text-sm font-medium text-[#a79f91] hover:bg-[#161822]"
          >
            How It Works
          </button>
          <button
            type="button"
            onClick={() => handleNav('workspace')}
            className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-medium ${
              activeTab === 'workspace' ? 'bg-[#1a1c26] text-[#fbf9f5] border border-[#c98a4b]/40' : 'text-[#a79f91] hover:bg-[#161822]'
            }`}
          >
            <span className="flex items-center gap-2">
              <Compass className="w-4 h-4 text-[#c98a4b]" />
              Studio Workspace
            </span>
            <span className="text-xs bg-[#c98a4b]/20 text-[#e5ab6e] px-2 py-0.5 rounded-md">Live</span>
          </button>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => handleNav('workspace')}
              className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-semibold text-sm text-[#0c0d11] bg-gradient-to-r from-[#e5ab6e] via-[#d49352] to-[#c98a4b]"
            >
              <Sparkles className="w-4 h-4 text-[#1a1309]" />
              Start Designing Now
            </button>
          </div>
        </div>
      )}
    </header>
  );
}
