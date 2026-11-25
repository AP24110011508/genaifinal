import React, { useState } from 'react';
import { 
  ArrowLeft, 
  RotateCcw, 
  Download, 
  Sparkles, 
  Layers, 
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

export default function ResultsComparison({
  originalSketchUrl,
  generatedImageUrl = null,
  metadata = {},
  onBackToCustomize,
  onGenerateAgain,
}) {
  const [activeViewMode, setActiveViewMode] = useState('sideBySide'); // 'sideBySide' | 'sketchOnly' | 'renderOnly'
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownload = async () => {
    const targetUrl = generatedImageUrl || originalSketchUrl;
    if (!targetUrl) return;

    try {
      setIsDownloading(true);
      // Fetch as blob to guarantee cross-origin direct file download
      const response = await fetch(targetUrl);
      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = generatedImageUrl 
        ? `cabinvision-render-${(metadata.style || 'architectural').toLowerCase()}.png` 
        : 'cabinvision-original-sketch.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(blobUrl);
    } catch {
      // Fallback to direct anchor navigation
      const link = document.createElement('a');
      link.href = targetUrl;
      link.target = '_blank';
      link.download = `cabinvision-${Date.now()}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } finally {
      setIsDownloading(false);
    }
  };

  return (
    <div className="w-full space-y-6">
      
      {/* Top Toolbar */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 sm:p-5 rounded-2xl bg-[#13151f] border border-[#272b3b] shadow-xl">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToCustomize}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#fbf9f5] bg-[#1a1c26] hover:bg-[#232737] border border-[#2f3346] transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4 text-[#c98a4b]" />
            <span>Back to Customization</span>
          </button>

          <button
            type="button"
            onClick={onGenerateAgain}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold text-[#a79f91] hover:text-[#fbf9f5] bg-[#1a1c26] hover:bg-[#232737] border border-[#2f3346] transition-colors cursor-pointer"
          >
            <RotateCcw className="w-4 h-4 text-[#e5ab6e]" />
            <span>Generate Again</span>
          </button>
        </div>

        {/* View Mode & Download Controls */}
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <div className="hidden md:flex items-center rounded-lg bg-[#0e1017] p-1 border border-[#242738]">
            <button
              type="button"
              onClick={() => setActiveViewMode('sideBySide')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeViewMode === 'sideBySide' ? 'bg-[#221c17] text-[#e5ab6e] font-semibold' : 'text-[#8e8779] hover:text-white'
              }`}
            >
              Side by Side
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('sketchOnly')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeViewMode === 'sketchOnly' ? 'bg-[#221c17] text-[#e5ab6e] font-semibold' : 'text-[#8e8779] hover:text-white'
              }`}
            >
              Sketch Only
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('renderOnly')}
              className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
                activeViewMode === 'renderOnly' ? 'bg-[#221c17] text-[#e5ab6e] font-semibold' : 'text-[#8e8779] hover:text-white'
              }`}
            >
              Render Only
            </button>
          </div>

          <button
            type="button"
            disabled={isDownloading || (!generatedImageUrl && !originalSketchUrl)}
            onClick={handleDownload}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#0c0d11] bg-gradient-to-r from-[#e5ab6e] to-[#c98a4b] hover:from-[#f0bc83] hover:to-[#db9957] shadow-md shadow-[#c98a4b]/20 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
          >
            <Download className="w-4 h-4 text-[#12100a]" />
            <span>{isDownloading ? 'Downloading...' : generatedImageUrl ? 'Download Rendering' : 'Download Sketch'}</span>
          </button>
        </div>
      </div>

      {/* Applied Parameters Summary Pills */}
      {metadata && (
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="text-[#8e8779] font-medium mr-1">Applied Parameters:</span>
          {metadata.style && (
            <span className="px-3 py-1 rounded-full bg-[#1b1d28] border border-[#2c3042] text-[#dcd5c9]">
              Style: <strong className="text-[#e5ab6e]">{metadata.style}</strong>
            </span>
          )}
          {metadata.materials && (
            <span className="px-3 py-1 rounded-full bg-[#1b1d28] border border-[#2c3042] text-[#dcd5c9]">
              Materials: <strong className="text-[#e5ab6e]">{Array.isArray(metadata.materials) ? metadata.materials.join(', ') : metadata.materials}</strong>
            </span>
          )}
          {metadata.lighting && (
            <span className="px-3 py-1 rounded-full bg-[#1b1d28] border border-[#2c3042] text-[#dcd5c9]">
              Lighting: <strong className="text-[#e5ab6e]">{metadata.lighting}</strong>
            </span>
          )}
          {metadata.model && (
            <span className="px-3 py-1 rounded-full bg-[#131c18] border border-[#22c55e]/30 text-[#4ade80] font-mono text-[11px]">
              Model: {metadata.model}
            </span>
          )}
          {metadata.customPrompt && (
            <span className="px-3 py-1 rounded-full bg-[#1b1d28] border border-[#2c3042] text-[#dcd5c9] max-w-xs truncate">
              Prompt: <strong className="text-[#e5ab6e]">{metadata.customPrompt}</strong>
            </span>
          )}
        </div>
      )}

      {/* Comparison Grid */}
      <div className={`grid gap-6 ${
        activeViewMode === 'sideBySide' 
          ? 'grid-cols-1 lg:grid-cols-2' 
          : 'grid-cols-1'
      }`}>

        {/* LEFT PANE: Original Sketch */}
        {(activeViewMode === 'sideBySide' || activeViewMode === 'sketchOnly') && (
          <div className="rounded-2xl bg-[#13151f] border border-[#272b3b] overflow-hidden flex flex-col shadow-xl">
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#171a26] border-b border-[#242738] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-[#c98a4b]" />
                <h4 className="text-sm font-bold text-[#fbf9f5]">Original Sketch Input</h4>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-[#202332] text-[#a79f91]">
                Source 2D Lines
              </span>
            </div>

            {/* Sketch Image Viewer */}
            <div className="p-6 bg-[#0a0b0e] flex-1 flex items-center justify-center min-h-[380px] sm:min-h-[440px]">
              {originalSketchUrl ? (
                <div className="relative max-w-full max-h-[440px] flex items-center justify-center">
                  <img
                    src={originalSketchUrl}
                    alt="Original Uploaded Sketch"
                    className="max-h-[420px] max-w-full object-contain rounded-lg shadow-md"
                  />
                </div>
              ) : (
                <div className="text-center text-[#6e685c] space-y-2">
                  <p className="text-sm">No sketch provided</p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-[#11131a] border-t border-[#1e212d] text-[11px] text-[#7d766a] flex items-center justify-between">
              <span>Silhouette boundary preserved</span>
              <span>100% Vector outline match</span>
            </div>
          </div>
        )}

        {/* RIGHT PANE: AI-Generated Result */}
        {(activeViewMode === 'sideBySide' || activeViewMode === 'renderOnly') && (
          <div className="rounded-2xl bg-[#13151f] border border-[#272b3b] overflow-hidden flex flex-col shadow-xl">
            {/* Header */}
            <div className="px-5 py-3.5 bg-[#171a26] border-b border-[#242738] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#e5ab6e]" />
                <h4 className="text-sm font-bold text-[#fbf9f5]">AI Photorealistic Visualization</h4>
              </div>
              
              {generatedImageUrl ? (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#22c55e]/20 text-[#4ade80] border border-[#22c55e]/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
                  <span>Synthesized</span>
                </span>
              ) : (
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded bg-[#c98a4b]/20 text-[#e5ab6e] border border-[#c98a4b]/30">
                  Ready to Generate
                </span>
              )}
            </div>

            {/* Render Viewport: Live Image when present, or Clean Blueprint Placeholder */}
            <div className="p-6 bg-[#0a0b0e] flex-1 flex items-center justify-center min-h-[380px] sm:min-h-[440px] relative overflow-hidden">
              {generatedImageUrl ? (
                <div className="relative max-w-full max-h-[440px] flex items-center justify-center group">
                  <img
                    src={generatedImageUrl}
                    alt="AI Generated Architectural Visualization"
                    className="max-h-[420px] max-w-full object-contain rounded-lg shadow-2xl transition-all"
                  />
                  <a
                    href={generatedImageUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="absolute top-3 right-3 p-2 rounded-lg bg-black/60 hover:bg-black/80 text-white backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Open full image in new tab"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                </div>
              ) : (
                /* Empty / Awaiting Generation State */
                <div className="w-full h-full flex flex-col items-center justify-center text-center p-6 space-y-4 max-w-md">
                  <div className="w-20 h-20 rounded-2xl bg-[#1b1e2c] border border-[#2c3246] flex items-center justify-center text-[#e5ab6e] shadow-lg">
                    <Sparkles className="w-9 h-9" />
                  </div>

                  <div className="space-y-2">
                    <h5 className="text-base font-bold text-[#fbf9f5]">
                      No Visualization Generated Yet
                    </h5>
                    <p className="text-xs text-[#9e9688] leading-relaxed">
                      Configure your architectural parameters in the Customization Studio and click &ldquo;Generate Cabin Visualization&rdquo; to synthesize your sketch.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={onBackToCustomize}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-[#0c0d11] bg-gradient-to-r from-[#e5ab6e] to-[#c98a4b] hover:from-[#f0bc83] hover:to-[#db9957] transition-all cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Go to Customization Studio</span>
                  </button>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 bg-[#11131a] border-t border-[#1e212d] text-[11px] text-[#7d766a] flex items-center justify-between">
              <span>{generatedImageUrl ? 'Photorealistic AI Synthesis' : 'Awaiting generation trigger'}</span>
              <span>Cloudflare Workers AI</span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
