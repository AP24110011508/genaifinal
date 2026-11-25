import React, { useState } from 'react';
import { 
  Copy, 
  Check, 
  X, 
  AlertTriangle, 
  Code2, 
  ArrowRight,
  ShieldCheck
} from 'lucide-react';

export default function PayloadInspectionModal({ isOpen, onClose, payload, onProceedToResults }) {
  const [copied, setCopied] = useState(false);

  if (!isOpen || !payload) return null;

  const jsonString = JSON.stringify(payload, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(jsonString);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div 
        className="w-full max-w-2xl rounded-2xl bg-[#12141c] border border-[#2d3144] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-6 py-4.5 border-b border-[#222536] flex items-center justify-between bg-[#161824]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#c98a4b]/15 border border-[#c98a4b]/30 flex items-center justify-center text-[#e5ab6e]">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-[#fbf9f5]">
                Frontend Validation &amp; Payload Inspector
              </h3>
              <p className="text-xs text-[#9e9688]">
                Inspect the request before sending it to the backend
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-[#8e8779] hover:text-white hover:bg-[#232738] transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Notice Banner */}
        <div className="px-6 py-3 bg-[#241a12] border-b border-[#4d321c] flex items-start gap-2.5 text-xs text-[#e5ab6e]">
          <AlertTriangle className="w-4 h-4 shrink-0 text-[#e5ab6e] mt-0.5" />
          <p className="leading-relaxed">
            <strong className="text-white">No request has been sent.</strong> Opening this inspector only displays the current request payload. Use Generate Cabin Visualization to submit it to the backend.
          </p>
        </div>

        {/* Modal Body: JSON View */}
        <div className="p-6 overflow-y-auto space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono text-[#a79f91]">
              <Code2 className="w-4 h-4 text-[#c98a4b]" />
              <span>GENERATION_REQUEST_PAYLOAD.json</span>
            </div>

            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#dcd5c9] bg-[#1d202e] hover:bg-[#272c3f] border border-[#2e344a] transition-colors"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-[#22c55e]" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Copied to Clipboard' : 'Copy JSON'}</span>
            </button>
          </div>

          {/* Formatted Code Block */}
          <div className="rounded-xl bg-[#090a0e] border border-[#1e212d] p-4 font-mono text-xs text-[#d8d1c2] overflow-x-auto leading-relaxed shadow-inner">
            <pre>{jsonString}</pre>
          </div>

          {/* Parameter Summary Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 text-xs">
            <div className="p-3 rounded-xl bg-[#161823] border border-[#242738]">
              <span className="text-[10px] text-[#7d766a] uppercase tracking-wider block">Style</span>
              <span className="font-bold text-[#fbf9f5] mt-0.5 block">{payload.style}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#161823] border border-[#242738]">
              <span className="text-[10px] text-[#7d766a] uppercase tracking-wider block">Materials</span>
              <span className="font-bold text-[#fbf9f5] mt-0.5 block">{payload.materials?.join(', ')}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#161823] border border-[#242738]">
              <span className="text-[10px] text-[#7d766a] uppercase tracking-wider block">Lighting</span>
              <span className="font-bold text-[#fbf9f5] mt-0.5 block">{payload.lighting}</span>
            </div>
            <div className="p-3 rounded-xl bg-[#161823] border border-[#242738]">
              <span className="text-[10px] text-[#7d766a] uppercase tracking-wider block">Sketch File</span>
              <span className="font-bold text-[#e5ab6e] mt-0.5 block truncate">{payload.fileMetadata?.name || 'Attached'}</span>
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-[#222536] bg-[#161824] flex items-center justify-between gap-3">
          <span className="text-xs text-[#7d766a]">
            No API request sent
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-[#a79f91] hover:text-white bg-[#1e212d] hover:bg-[#282c3c] border border-[#2f3346] transition-colors"
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                if (onProceedToResults) onProceedToResults();
              }}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-semibold text-[#0c0d11] bg-gradient-to-r from-[#e5ab6e] via-[#d49352] to-[#c98a4b] hover:from-[#f0bc83] hover:to-[#db9957] transition-all"
            >
              <span>View Results Layout</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
