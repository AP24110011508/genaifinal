// Sample architectural sketch data URL for quick testing and demonstration
export const SAMPLE_CABIN_SKETCH_SVG = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600" style="background:%23fbf8f2">
  <defs>
    <filter id="sketch-filter">
      <feTurbulence type="fractalNoise" baseFrequency="0.04" numOctaves="3" result="noise" />
      <feDisplacementMap in="SourceGraphic" in2="noise" scale="3" xChannelSelector="R" yChannelSelector="G" />
    </filter>
  </defs>
  <g filter="url(%23sketch-filter)" stroke="%232b2622" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round">
    <!-- Ground / Terrain lines -->
    <path d="M 40 520 Q 220 500 400 525 T 760 515" />
    <path d="M 60 535 Q 260 520 480 540 T 740 530" stroke-dasharray="8 4" stroke-width="1.8" />
    
    <!-- Alpine Pine Trees background -->
    <path d="M 120 480 L 140 380 L 160 480 Z" stroke-width="1.8" />
    <path d="M 105 440 L 140 350 L 175 440" stroke-width="1.8" />
    <path d="M 90 480 L 140 320 L 190 480" stroke-width="1.8" />

    <path d="M 640 480 L 660 360 L 680 480 Z" stroke-width="1.8" />
    <path d="M 625 430 L 660 330 L 695 430" stroke-width="1.8" />
    <path d="M 610 470 L 660 300 L 710 470" stroke-width="1.8" />

    <!-- A-Frame Main Cabin Structure -->
    <!-- Foundation Stone Pier -->
    <rect x="220" y="470" width="360" height="40" stroke-width="2.2" />
    <line x1="260" y1="470" x2="260" y2="510" />
    <line x1="310" y1="470" x2="310" y2="510" />
    <line x1="420" y1="470" x2="420" y2="510" />
    <line x1="510" y1="470" x2="510" y2="510" />

    <!-- Main A-Frame Roof Truss -->
    <polygon points="400,120 200,480 600,480" stroke-width="3.5" />
    <!-- Overhang lines -->
    <line x1="400" y1="100" x2="180" y2="495" stroke-width="3" />
    <line x1="400" y1="100" x2="620" y2="495" stroke-width="3" />

    <!-- Large Triangular Glass Facade Mullions -->
    <line x1="400" y1="140" x2="400" y2="470" stroke-width="2.5" />
    <line x1="280" y1="470" x2="340" y2="240" stroke-width="2" />
    <line x1="520" y1="470" x2="460" y2="240" stroke-width="2" />
    <!-- Horizontal Glass Divider -->
    <line x1="255" y1="380" x2="545" y2="380" stroke-width="2" />
    <line x1="315" y1="280" x2="485" y2="280" stroke-width="2" />

    <!-- Front Timber Deck & Railing -->
    <polygon points="160,490 640,490 620,530 180,530" stroke-width="2.2" />
    <line x1="200" y1="490" x2="200" y2="530" />
    <line x1="280" y1="490" x2="280" y2="530" />
    <line x1="360" y1="490" x2="360" y2="530" />
    <line x1="440" y1="490" x2="440" y2="530" />
    <line x1="520" y1="490" x2="520" y2="530" />
    <line x1="600" y1="490" x2="600" y2="530" />

    <!-- Modern Wood Entry Door -->
    <rect x="375" y="380" width="50" height="90" stroke-width="2" />
    <circle cx="385" cy="425" r="2.5" fill="%232b2622" />

    <!-- Modern Stone Chimney -->
    <rect x="470" y="140" width="35" height="150" stroke-width="2.2" />
    <line x1="465" y1="140" x2="510" y2="140" stroke-width="2.5" />

    <!-- Architectural hand notes / annotations -->
    <text x="60" y="80" font-family="monospace" font-size="16" fill="%236e655d" stroke="none">CONCEPT: NORDIC A-FRAME</text>
    <text x="60" y="105" font-family="monospace" font-size="13" fill="%238a8076" stroke="none">SLOPE: 60 DEG | CEDAR &amp; GLASS FACADE</text>
  </g>
</svg>`;

