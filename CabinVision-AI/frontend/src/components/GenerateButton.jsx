import React, { useState } from 'react';
import { Sparkles, AlertCircle, CheckCircle2, Loader2, Code2, AlertTriangle } from 'lucide-react';
import { buildGenerationPayload } from '../services/api';
import PayloadInspectionModal from './PayloadInspectionModal';

export default function GenerateButton({
  sketchFile,
  sketchPreview,
  imageId,
  selectedStyle,
  selectedMaterials,
  selectedLighting,
  customPrompt,
  isGenerating = false,
  isUploading = false,
  generationError = null,
  onGenerate,
  onProceedToResults,
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [preparedPayload, setPreparedPayload] = useState(null);

  const hasSketch = Boolean(sketchFile || sketchPreview || imageId);
  const hasMaterials = selectedMaterials && selectedMaterials.length > 0;
  const isReady = hasSketch && Boolean(selectedStyle) && hasMaterials && Boolean(selectedLighting);

  const handleOpenInspector = () => {
    const payload = buildGenerationPayload({
      file: sketchFile,
      imageId: imageId,
      style: selectedStyle,
      materials: selectedMaterials,
      lighting: selectedLighting,
      customPrompt: customPrompt,
    });
    setPreparedPayload(payload);
    setModalOpen(true);
  };

  return (
    <>
      <div className="w-full space-y-3.5">
        
        {/* Error Banner if Generation Failed */}
        {generationError && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-[#2a1313] border border-[#7f1d1d] text-[#fca5a5] text-xs sm:text-sm animate-fadeIn">
            <AlertTriangle className="w-5 h-5 shrink-0 text-[#ef4444] mt-0.5" />
            <div className="flex-1 space-y-1">
              <p className="font-bold text-white">Generation Failed</p>
              <p className="text-xs text-[#fca5a5] leading-relaxed">{generationError}</p>
            </div>
          </div>
        )}

        {/* Input Validation Status Indicator */}
        {!hasSketch ? (
          <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#1b1c24] border border-[#2b2e3e] text-xs text-[#a79f91]">
            <AlertCircle className="w-4 h-4 text-[#e5ab6e] shrink-0" />
            <span>Please upload a sketch image above to enable generation.</span>
          </div>
        ) : (
          <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[#141b18] border border-[#1b3a28] text-xs text-[#86efac]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#22c55e] shrink-0" />
              <span>Sketch and parameters configured.</span>
            </div>
            <span className="text-[11px] font-mono text-[#4ade80]">Ready to Generate</span>
          </div>
        )}

        {/* Main Action Button */}
        <button
          type="button"
          disabled={!isReady || isGenerating || isUploading}
          onClick={onGenerate}
          className={`w-full py-4 px-6 rounded-xl font-bold text-sm sm:text-base flex items-center justify-center gap-3 transition-all duration-200 shadow-lg ${
            isGenerating
              ? 'text-[#0c0d11] bg-gradient-to-r from-[#d49352] to-[#c98a4b] cursor-wait opacity-90'
              : isReady
              ? 'text-[#0c0d11] bg-gradient-to-r from-[#e5ab6e] via-[#d49352] to-[#c98a4b] hover:from-[#f0bc83] hover:to-[#db9957] shadow-[#c98a4b]/20 hover:shadow-[#c98a4b]/35 active:scale-[0.99] cursor-pointer'
              : 'text-[#6e685c] bg-[#161822] border border-[#272b3a] cursor-not-allowed opacity-60'
          }`}
        >
          {isUploading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-[#140e06]" />
              <span>Uploading sketch...</span>
            </>
          ) : isGenerating ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin text-[#140e06]" />
              <span>Synthesizing with Cloudflare Workers AI...</span>
            </>
          ) : (
            <>
              <Sparkles className={`w-5 h-5 ${isReady ? 'text-[#140e06]' : 'text-[#6e685c]'}`} />
              <span>Generate Cabin Visualization</span>
            </>
          )}
        </button>

        {/* Generation Progress Indicator */}
        {isGenerating && (
          <div className="rounded-xl p-3 bg-[#171a25] border border-[#2d3144] space-y-2 text-xs text-[#dcd5c9] animate-fadeIn">
            <div className="flex items-center justify-between text-[#e5ab6e] font-medium">
              <span className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#e5ab6e] animate-ping" />
                Cloudflare Image Synthesis Active
              </span>
            </div>
            <div className="w-full bg-[#0c0d12] rounded-full h-1.5 overflow-hidden">
              <div className="bg-gradient-to-r from-[#e5ab6e] to-[#c98a4b] h-1.5 rounded-full animate-pulse w-3/4" />
            </div>
            <p className="text-[11px] text-[#8e8779]">
              Preserving structural silhouette while rendering natural timber, fieldstone, and realistic lighting...
            </p>
          </div>
        )}

        {/* Footer: Inspector Trigger */}
        <div className="flex items-center justify-between text-[11px] text-[#7d766a] pt-1 px-1">
          <span>Cloudflare Workers AI image generation and editing</span>
          <button
            type="button"
            onClick={handleOpenInspector}
            className="inline-flex items-center gap-1 hover:text-[#e5ab6e] transition-colors cursor-pointer"
          >
            <Code2 className="w-3 h-3 text-[#c98a4b]" />
            <span>Inspect Payload JSON</span>
          </button>
        </div>
      </div>

      {/* Modal Inspector */}
      <PayloadInspectionModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        payload={preparedPayload}
        onProceedToResults={onProceedToResults}
      />
    </>
  );
}
