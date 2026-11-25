import React, { useState } from 'react';
import { Sparkles, ArrowRight, Sliders, CheckCircle2, Eye, Layers } from 'lucide-react';
import { SAMPLE_CABIN_SKETCH_SVG } from '../assets/sampleCabinSketch';

export default function Hero({ onStartDesigning }) {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isDragging, setIsDragging] = useState(false);

  // Allow interactive drag or click on the comparison preview
  const handleMove = (clientX, rect) => {
    const x = clientX - rect.left;
    const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
    setSliderPosition(percentage);
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;
    const rect = e.currentTarget.getBoundingClientRect();
    handleMove(e.clientX, rect);
  };

  const handleTouchMove = (e) => {
    if (e.touches.length === 0) return;
    const rect = e.currentTarget.getBoundingClientRect();
    handleMove(e.touches[0].clientX, rect);
  };

  return (
    <section className="relative overflow-hidden pt-12 pb-24 md:pt-20 md:pb-32 bg-grid-pattern">
      {/* Ambient background glow accents */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[360px] bg-[#c98a4b]/10 blur-[130px] rounded-full pointer-events-none" />
      <div className="absolute top-1/3 -left-20 w-[400px] h-[300px] bg-[#8c5222]/10 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Top Announcement Pill */}
        <div className="flex justify-center mb-6">
          <div className="inline-flex items-center gap-2.5 px-4 py-1.5 rounded-full bg-[#181a24] border border-[#2d3040] shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-[#e5ab6e] animate-pulse" />
            <span className="text-xs font-medium text-[#d8d1c2] tracking-wide">
              Architectural Generative AI Engine
            </span>
            <span className="text-[11px] text-[#c98a4b] bg-[#c98a4b]/15 px-2 py-0.5 rounded-md font-semibold">
              CabinVision Studio
            </span>
          </div>
        </div>

        {/* Main Hero Header */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-6xl lg:text-7xl font-bold tracking-tight text-[#fbf9f5] leading-[1.08]">
            Transform Your Sketch into{' '}
            <span className="bg-gradient-to-r from-[#f0bc83] via-[#d49352] to-[#b87537] bg-clip-text text-transparent">
              Reality.
            </span>
          </h1>

          <p className="text-lg sm:text-xl text-[#b5ad9e] max-w-2xl mx-auto leading-relaxed font-normal">
            An AI-powered web application that converts hand-drawn cabin sketches into photorealistic architectural visualizations. Preserve your structural silhouette while synthesizing natural timber, fieldstone, and atmospheric lighting.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-3">
            <button
              type="button"
              onClick={onStartDesigning}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-3 px-8 py-4 rounded-xl text-base font-semibold text-[#0c0d11] bg-gradient-to-r from-[#e5ab6e] via-[#d49352] to-[#c98a4b] hover:from-[#f0bc83] hover:to-[#db9957] shadow-xl shadow-[#c98a4b]/20 hover:shadow-[#c98a4b]/35 active:scale-[0.98] transition-all duration-200 cursor-pointer"
            >
              <Sparkles className="w-5 h-5 text-[#161007]" />
              <span>Start Designing</span>
              <ArrowRight className="w-5 h-5 text-[#161007]" />
            </button>

            <a
              href="#how-it-works"
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-xl text-base font-medium text-[#dcd5c9] bg-[#161822] hover:bg-[#1f2230] border border-[#2d3040] hover:border-[#3e4256] transition-all duration-200"
            >
              <Eye className="w-4 h-4 text-[#c98a4b]" />
              <span>See How It Works</span>
            </a>
          </div>

          {/* Core Feature Badges */}
          <div className="pt-8 flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-xs sm:text-sm text-[#9e9688]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#c98a4b]" />
              <span>Preserves Exact Proportions</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#c98a4b]" />
              <span>Authentic Cedar &amp; Stone Textures</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#c98a4b]" />
              <span>Atmospheric Lighting Simulation</span>
            </div>
          </div>
        </div>

        {/* Interactive Before / After Architectural Transformation Card */}
        <div className="mt-16 max-w-5xl mx-auto">
          <div className="rounded-2xl p-2 sm:p-3 bg-gradient-to-b from-[#2a2d3b] to-[#161720] border border-[#323648] shadow-2xl">
            
            {/* Window chrome header */}
            <div className="px-4 py-2.5 flex items-center justify-between border-b border-[#252836] mb-2 text-xs text-[#a79f91]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#ef4444]/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#eab308]/70" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e]/70" />
                <span className="ml-2 font-mono text-[11px] text-[#787267]">CabinVision Studio – Interactive Visualizer</span>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-[#e5ab6e] font-medium">Drag slider to compare</span>
              </div>
            </div>

            {/* Split Visualizer Stage */}
            <div
              className="relative w-full h-[340px] sm:h-[460px] md:h-[520px] rounded-xl overflow-hidden cursor-ew-resize select-none bg-[#111219]"
              onMouseDown={() => setIsDragging(true)}
              onMouseUp={() => setIsDragging(false)}
              onMouseLeave={() => setIsDragging(false)}
              onMouseMove={handleMouseMove}
              onTouchStart={() => setIsDragging(true)}
              onTouchEnd={() => setIsDragging(false)}
              onTouchMove={handleTouchMove}
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                handleMove(e.clientX, rect);
              }}
            >
              {/* Layer 1 (Full): Photorealistic AI Visualization Representation */}
              <div className="absolute inset-0 w-full h-full bg-[#0a0c10]">
                {/* Architectural rendering representation built with pure SVG & CSS gradients for zero broken image dependencies */}
                <div className="w-full h-full relative overflow-hidden flex items-center justify-center bg-gradient-to-b from-[#182333] via-[#2d221c] to-[#0c0d12]">
                  {/* Sunset Sky and Alpine Horizon */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e0f14] via-[#241711]/80 to-[#192b45]/90" />
                  
                  {/* Distant mountain silhouettes */}
                  <svg className="absolute bottom-0 w-full h-full pointer-events-none opacity-60" viewBox="0 0 1000 600" preserveAspectRatio="none">
                    <polygon points="0,480 180,320 340,460 520,290 700,430 880,310 1000,440 1000,600 0,600" fill="#131722" />
                    <polygon points="0,520 220,380 440,510 650,370 820,490 1000,410 1000,600 0,600" fill="#0d1017" />
                    
                    {/* Pine Tree Forest silhouettes */}
                    <g fill="#080a0f">
                      <polygon points="80,560 100,440 120,560" />
                      <polygon points="110,570 135,420 160,570" />
                      <polygon points="140,560 165,450 190,560" />
                      <polygon points="780,560 805,430 830,560" />
                      <polygon points="815,570 840,410 865,570" />
                      <polygon points="850,560 880,440 910,560" />
                    </g>
                  </svg>

                  {/* Rendered Modern A-Frame Cabin with warm cedar materials & interior glow */}
                  <div className="relative z-10 w-full max-w-lg aspect-[4/3] flex items-center justify-center">
                    <svg viewBox="0 0 600 480" className="w-full h-full drop-shadow-[0_20px_35px_rgba(217,147,82,0.18)]">
                      <defs>
                        {/* Cedar wood texture gradient */}
                        <linearGradient id="cedarWood" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#bf733b" />
                          <stop offset="50%" stopColor="#8f4d22" />
                          <stop offset="100%" stopColor="#673514" />
                        </linearGradient>

                        {/* Warm interior lighting glow */}
                        <radialGradient id="interiorGlow" cx="50%" cy="65%" r="60%">
                          <stop offset="0%" stopColor="#ffea9f" stopOpacity="0.95" />
                          <stop offset="40%" stopColor="#e5a144" stopOpacity="0.8" />
                          <stop offset="100%" stopColor="#b3561b" stopOpacity="0.4" />
                        </radialGradient>

                        {/* Architectural Glass Reflection */}
                        <linearGradient id="glassReflect" x1="0%" y1="0%" x2="100%" y2="100%">
                          <stop offset="0%" stopColor="#a5c7eb" stopOpacity="0.35" />
                          <stop offset="35%" stopColor="#45688a" stopOpacity="0.2" />
                          <stop offset="70%" stopColor="#ffb973" stopOpacity="0.25" />
                          <stop offset="100%" stopColor="#1a2b3d" stopOpacity="0.4" />
                        </linearGradient>

                        {/* Rugged Fieldstone Pier */}
                        <linearGradient id="fieldstone" x1="0%" y1="0%" x2="0%" y2="100%">
                          <stop offset="0%" stopColor="#4d5059" />
                          <stop offset="100%" stopColor="#25272d" />
                        </linearGradient>
                      </defs>

                      {/* Stone base */}
                      <rect x="150" y="380" width="300" height="35" rx="4" fill="url(#fieldstone)" stroke="#1a1c22" strokeWidth="2" />
                      {/* Timber Deck */}
                      <polygon points="100,400 500,400 480,430 120,430" fill="#6a3a19" stroke="#4a250e" strokeWidth="2" />

                      {/* Main A-Frame Roof Frame (Dark charcoal metal standing seam) */}
                      <polygon points="300,60 140,390 460,390" fill="#1b1d24" stroke="#121318" strokeWidth="6" />

                      {/* Massive Triangular Glass Curtain Wall with Interior Warm Hearth */}
                      <polygon points="300,85 160,380 440,380" fill="url(#interiorGlow)" />
                      <polygon points="300,85 160,380 440,380" fill="url(#glassReflect)" />

                      {/* Architectural Mullions & Timber Frame Trusses */}
                      <line x1="300" y1="85" x2="300" y2="380" stroke="#1b1d24" strokeWidth="4" />
                      <line x1="230" y1="230" x2="370" y2="230" stroke="#1b1d24" strokeWidth="3" />
                      <line x1="190" y1="310" x2="410" y2="310" stroke="#1b1d24" strokeWidth="3" />
                      
                      {/* Cedar Siding Accent Wing */}
                      <polygon points="140,390 100,400 130,340" fill="url(#cedarWood)" />
                      <polygon points="460,390 500,400 470,340" fill="url(#cedarWood)" />

                      {/* Modern Entry Door */}
                      <rect x="280" y="310" width="40" height="70" fill="#4d2912" stroke="#e5ab6e" strokeWidth="1.5" />
                      <circle cx="288" cy="345" r="2" fill="#ffd188" />

                      {/* Warm Hearth Interior Silhouettes */}
                      <circle cx="300" cy="360" r="12" fill="#ff7a18" filter="blur(4px)" opacity="0.8" />
                      
                      {/* Modern Stone Chimney */}
                      <rect x="370" y="80" width="30" height="120" fill="url(#fieldstone)" stroke="#1a1c22" strokeWidth="2" />
                    </svg>
                  </div>

                  {/* Water / Lake reflection gradient at base */}
                  <div className="absolute bottom-0 w-full h-16 bg-gradient-to-t from-[#090b10] via-[#10141d]/70 to-transparent pointer-events-none" />
                </div>

                {/* Rendered Badge */}
                <div className="absolute bottom-4 right-4 z-20 bg-[#121319]/90 border border-[#c98a4b]/40 backdrop-blur-md px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#fbf9f5] flex items-center gap-2 shadow-lg">
                  <Sparkles className="w-3.5 h-3.5 text-[#e5ab6e]" />
                  <span>AI Photorealistic Visualization</span>
                </div>
              </div>

              {/* Layer 2 (Clipped): Original Hand-Drawn Sketch */}
              <div
                className="absolute inset-y-0 left-0 overflow-hidden bg-[#fbf8f2] border-r-2 border-[#e5ab6e]"
                style={{ width: `${sliderPosition}%` }}
              >
                <div className="w-[1000px] h-full relative flex items-center justify-center">
                  <img
                    src={SAMPLE_CABIN_SKETCH_SVG}
                    alt="Original Hand-drawn Sketch"
                    className="max-h-[92%] object-contain pointer-events-none"
                  />
                </div>

                {/* Sketch Badge */}
                <div className="absolute bottom-4 left-4 z-20 bg-[#2b2622]/90 border border-[#544b43] backdrop-blur-md px-3.5 py-1.5 rounded-lg text-xs font-medium text-[#fbf8f2] flex items-center gap-2 shadow-lg">
                  <Layers className="w-3.5 h-3.5 text-[#e5ab6e]" />
                  <span>Original Hand-Drawn Sketch</span>
                </div>
              </div>

              {/* Interactive Split Drag Handle */}
              <div
                className="absolute inset-y-0 -ml-4 w-8 flex items-center justify-center pointer-events-none z-30"
                style={{ left: `${sliderPosition}%` }}
              >
                <div className="w-8 h-8 rounded-full bg-[#e5ab6e] text-[#121319] shadow-xl flex items-center justify-center border-2 border-[#121319]">
                  <Sliders className="w-4 h-4 rotate-90" />
                </div>
              </div>

            </div>

            {/* Slider Hint */}
            <div className="py-2.5 px-4 text-center text-[12px] text-[#938b7d] flex items-center justify-center gap-2">
              <span>← Slide left for Photorealistic Render</span>
              <span className="text-[#c98a4b]">•</span>
              <span>Slide right for Hand Sketch →</span>
            </div>

          </div>
        </div>

      </div>
    </section>
  );
}
