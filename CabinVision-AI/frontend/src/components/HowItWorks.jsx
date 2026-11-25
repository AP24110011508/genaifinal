import React from 'react';
import { UploadCloud, SlidersHorizontal, Image as ImageIcon, ArrowRight, Sparkles } from 'lucide-react';

const STEPS = [
  {
    step: '01',
    icon: UploadCloud,
    title: 'Upload Hand-Drawn Sketch',
    desc: 'Draw your cabin concept on paper, an iPad, or any drawing canvas. Upload your sketch as JPG, JPEG, or PNG with zero manual cleanup required.',
  },
  {
    step: '02',
    icon: SlidersHorizontal,
    title: 'Choose Materials & Style',
    desc: 'Select your preferred architectural style (Modern, Rustic, Scandinavian, etc.), specify building materials (Timber, Stone, Glass), and choose lighting.',
  },
  {
    step: '03',
    icon: ImageIcon,
    title: 'Synthesize & Compare',
    desc: 'Our AI engine reconstructs depth, timber textures, glass reflections, and landscape surroundings, generating a side-by-side visualization ready to export.',
  },
];

export default function HowItWorks({ onStartDesigning }) {
  return (
    <section id="how-it-works" className="py-24 bg-[#0d0f14] border-t border-[#1c1d27] relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#c98a4b]/10 text-[#e5ab6e] border border-[#c98a4b]/20">
            <Sparkles className="w-3.5 h-3.5" />
            Simple 3-Step Process
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#fbf9f5]">
            How CabinVision AI Works
          </h2>
          <p className="text-base sm:text-lg text-[#9e9688]">
            From rough line ideation to a stunning client-ready visualization in three seamless steps.
          </p>
        </div>

        {/* Steps Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative">
          
          {/* Connector Line on Desktop */}
          <div className="hidden md:block absolute top-1/3 left-1/6 right-1/6 h-[1.5px] bg-gradient-to-r from-transparent via-[#c98a4b]/30 to-transparent -z-0" />

          {STEPS.map((s, idx) => {
            const Icon = s.icon;
            return (
              <div
                key={idx}
                className="relative z-10 rounded-2xl p-8 bg-[#13151e] border border-[#232635] hover:border-[#c98a4b]/50 transition-all duration-300 shadow-lg flex flex-col justify-between group"
              >
                <div>
                  {/* Step Header */}
                  <div className="flex items-center justify-between mb-6">
                    <span className="font-['Space_Grotesk'] text-4xl font-bold text-[#35394b] group-hover:text-[#c98a4b]/40 transition-colors">
                      {s.step}
                    </span>
                    <div className="w-14 h-14 rounded-2xl bg-[#1b1e2a] border border-[#2d3246] group-hover:border-[#c98a4b]/50 flex items-center justify-center text-[#e5ab6e] group-hover:scale-105 transition-all shadow-md">
                      <Icon className="w-7 h-7" />
                    </div>
                  </div>

                  <h3 className="text-xl font-bold text-[#fbf9f5] mb-3 group-hover:text-[#e5ab6e] transition-colors">
                    {s.title}
                  </h3>

                  <p className="text-sm text-[#9e9688] leading-relaxed">
                    {s.desc}
                  </p>
                </div>

                <div className="mt-8 pt-4 border-t border-[#1d202d] text-xs font-mono text-[#6e685c]">
                  STEP {idx + 1} OF 3
                </div>
              </div>
            );
          })}
        </div>

        {/* Bottom Banner CTA */}
        <div className="mt-16 rounded-2xl p-8 sm:p-10 bg-gradient-to-r from-[#171a25] via-[#1c1e29] to-[#25201c] border border-[#343748] shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <h3 className="text-2xl font-bold text-[#fbf9f5]">
              Ready to bring your cabin sketch to life?
            </h3>
            <p className="text-sm text-[#a79f91]">
              Try the interactive Studio workspace now. Test with your own drawing or our architectural sample.
            </p>
          </div>

          <button
            type="button"
            onClick={onStartDesigning}
            className="inline-flex items-center gap-3 px-7 py-3.5 rounded-xl font-semibold text-sm text-[#0c0d11] bg-gradient-to-r from-[#e5ab6e] via-[#d49352] to-[#c98a4b] hover:from-[#f0bc83] hover:to-[#db9957] shadow-lg shadow-[#c98a4b]/20 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <span>Open Studio Workspace</span>
            <ArrowRight className="w-4 h-4 text-[#12100a]" />
          </button>
        </div>

      </div>
    </section>
  );
}

