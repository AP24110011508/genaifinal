import React from 'react';
import { 
  Compass, 
  Palette, 
  SunMedium, 
  Clock, 
  DownloadCloud, 
  Layers,
  Sparkles
} from 'lucide-react';

const FEATURES = [
  {
    icon: Compass,
    title: 'Precise Silhouette Preservation',
    desc: 'Advanced computer vision parses hand-drawn line boundaries, maintaining your original roof pitch, window placement, and footprint without hallucinating random forms.',
    badge: 'Structural Integrity',
  },
  {
    icon: Palette,
    title: 'Natural Material Synthesis',
    desc: 'Intelligently renders rich textures including Western Red Cedar, charred Shou Sugi Ban, raw fieldstone, and architectural anodized steel framing.',
    badge: 'Material Engine',
  },
  {
    icon: SunMedium,
    title: 'Atmospheric Lighting Control',
    desc: 'Simulate crisp alpine daylight, golden sunset alpenglow, or warm interior hearth glow radiating through double-height panoramic glass at dusk.',
    badge: 'Ambience',
  },
  {
    icon: Layers,
    title: 'Architectural Style Presets',
    desc: 'Switch between Modern, Mountain Rustic, Minimalist, Luxury Lodge, or Nordic Scandinavian aesthetics with a single click.',
    badge: '5 Curated Styles',
  },
  {
    icon: Clock,
    title: 'Rapid Client Discovery',
    desc: 'Eliminate weeks of 3D modeling and rendering setup during early client discovery. Go from napkin sketch to presentation-ready visualization in seconds.',
    badge: 'Sub-30s Turnaround',
  },
  {
    icon: DownloadCloud,
    title: 'Production Export Ready',
    desc: 'Export high-definition visualization renders suitable for client pitch decks, architectural moodboards, and landscape planning overlays.',
    badge: 'High Fidelity',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-24 bg-[#0a0b0e] border-t border-[#1c1d26] relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full text-xs font-semibold tracking-wider uppercase bg-[#c98a4b]/10 text-[#e5ab6e] border border-[#c98a4b]/20">
            <Sparkles className="w-3.5 h-3.5" />
            Core Capabilities
          </div>
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-[#fbf9f5]">
            Engineered for Architects, Designers &amp; Visionaries
          </h2>
          <p className="text-base sm:text-lg text-[#9e9688] leading-relaxed">
            Bridging the gap between spontaneous hand ideation and client-ready architectural rendering with fine-grained control over materials, style, and atmosphere.
          </p>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
          {FEATURES.map((feat, idx) => {
            const Icon = feat.icon;
            return (
              <div
                key={idx}
                className="group relative rounded-2xl p-7 bg-[#12141c] hover:bg-[#161822] border border-[#232634] hover:border-[#c98a4b]/40 transition-all duration-300 shadow-md hover:shadow-xl hover:shadow-[#c98a4b]/5 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-xl bg-[#1c1f2b] border border-[#2d3142] group-hover:border-[#c98a4b]/40 flex items-center justify-center text-[#e5ab6e] transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[11px] font-medium tracking-wide uppercase px-2.5 py-1 rounded-full bg-[#1e212d] text-[#a79f91] border border-[#2c3042]">
                      {feat.badge}
                    </span>
                  </div>

                  <h3 className="text-xl font-bold text-[#fbf9f5] mb-2.5 group-hover:text-[#e5ab6e] transition-colors">
                    {feat.title}
                  </h3>

                  <p className="text-sm text-[#9e9688] leading-relaxed">
                    {feat.desc}
                  </p>
                </div>

                <div className="mt-6 pt-4 border-t border-[#1d202c] flex items-center gap-2 text-xs text-[#7d766a] group-hover:text-[#c98a4b] transition-colors">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#c98a4b]" />
                  <span>Integrated Studio Workflow</span>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </section>
  );
}
