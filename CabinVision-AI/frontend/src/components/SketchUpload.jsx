import React, { useState, useRef, useEffect } from 'react';
import { 
  UploadCloud, 
  Trash2, 
  RefreshCw, 
  AlertCircle, 
  FileCheck, 
  Sparkles,
  Loader2,
  CheckCircle2
} from 'lucide-react';
import { validateSketchFile } from '../services/api';
import { SAMPLE_CABIN_SKETCH_SVG } from '../assets/sampleCabinSketch';

export default function SketchUpload({ 
  sketchFile, 
  previewUrl, 
  imageId,
  isUploading,
  uploadError,
  onSketchChange, 
  onSketchRemove 
}) {
  const [isDragging, setIsDragging] = useState(false);
  const [validationError, setValidationError] = useState(null);
  const fileInputRef = useRef(null);

  // Clean up object URLs on unmount or file change
  useEffect(() => {
    return () => {
      if (previewUrl && previewUrl.startsWith('blob:')) {
        URL.revokeObjectURL(previewUrl);
      }
    };
  }, [previewUrl]);

  const processFile = (file) => {
    setValidationError(null);
    if (!file) return;

    const validation = validateSketchFile(file);
    if (!validation.valid) {
      setValidationError(validation.error);
      return;
    }

    const objectUrl = URL.createObjectURL(file);
    onSketchChange(file, objectUrl);
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragEnter = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processFile(file);
      e.dataTransfer.clearData();
    }
  };

  const handleFileInputChange = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      processFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleBrowseClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  // Helper to load sample sketch for quick testing
  const handleLoadSample = async () => {
    try {
      setValidationError(null);
      const res = await fetch(SAMPLE_CABIN_SKETCH_SVG);
      if (!res.ok) {
        throw new Error(`Failed to load sample sketch (${res.status}).`);
      }

      const bitmap = await createImageBitmap(await res.blob());
      let sampleFile;
      try {
        const canvas = document.createElement('canvas');
        canvas.width = bitmap.width;
        canvas.height = bitmap.height;
        const context = canvas.getContext('2d');
        if (!context) {
          throw new Error('Unable to prepare the sample sketch image.');
        }

        context.fillStyle = '#fbf8f2';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.drawImage(bitmap, 0, 0);

        const pngBlob = await new Promise((resolve, reject) => {
          canvas.toBlob((blob) => {
            if (blob) {
              resolve(blob);
            } else {
              reject(new Error('Unable to convert the sample sketch to PNG.'));
            }
          }, 'image/png');
        });
        sampleFile = new File([pngBlob], 'sample-nordic-aframe-sketch.png', { type: 'image/png' });
      } finally {
        bitmap.close();
      }

      const objectUrl = URL.createObjectURL(sampleFile);
      onSketchChange(sampleFile, objectUrl);
    } catch (err) {
      setValidationError(err.message || 'Failed to load sample sketch.');
    }
  };

  const handleRemove = () => {
    setValidationError(null);
    onSketchRemove();
  };

  const displayedError = validationError || uploadError;

  return (
    <div className="w-full space-y-4">
      {/* Hidden native input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,image/jpeg,image/png"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* Validation / Upload Error Banner */}
      {displayedError && (
        <div className="flex items-start gap-3 p-4 rounded-xl bg-[#2a1313] border border-[#7f1d1d] text-[#fca5a5] text-sm animate-fadeIn">
          <AlertCircle className="w-5 h-5 shrink-0 text-[#ef4444] mt-0.5" />
          <div className="flex-1">
            <p className="font-semibold text-white">Upload Error</p>
            <p className="text-xs text-[#fca5a5] mt-0.5">{displayedError}</p>
          </div>
          <button
            type="button"
            onClick={() => setValidationError(null)}
            className="text-xs text-[#fca5a5] hover:text-white px-2 py-1 rounded-md bg-[#451414] hover:bg-[#5a1b1b] cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Upload Zone / Preview Container */}
      {!previewUrl ? (
        <div
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={handleBrowseClick}
          className={`relative border-2 border-dashed rounded-2xl p-8 sm:p-12 text-center cursor-pointer transition-all duration-300 group ${
            isDragging
              ? 'border-[#e5ab6e] bg-[#221c17] scale-[1.01] shadow-xl shadow-[#c98a4b]/20'
              : 'border-[#2c3040] hover:border-[#c98a4b]/70 bg-[#12141c] hover:bg-[#151722]'
          }`}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-transparent via-[#c98a4b]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl pointer-events-none" />

          <div className="flex flex-col items-center justify-center space-y-4 relative z-10">
            {/* Upload Icon */}
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all duration-300 ${
              isDragging
                ? 'bg-[#e5ab6e] text-[#121319] scale-110'
                : 'bg-[#1b1e2b] text-[#e5ab6e] border border-[#2e3346] group-hover:border-[#c98a4b]/60 group-hover:scale-105'
            }`}>
              <UploadCloud className="w-8 h-8" />
            </div>

            <div className="space-y-1.5 max-w-sm">
              <h4 className="text-lg font-bold text-[#fbf9f5]">
                {isDragging ? 'Drop your cabin sketch here' : 'Upload Hand-Drawn Sketch'}
              </h4>
              <p className="text-xs sm:text-sm text-[#9e9688]">
                Drag and drop your sketch image here, or{' '}
                <span className="text-[#e5ab6e] font-semibold underline underline-offset-2">browse files</span>
              </p>
            </div>

            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#191b26] border border-[#2b2f42] text-[11px] text-[#8e8779]">
              <span>JPG, JPEG, PNG</span>
              <span>•</span>
              <span>Max 10 MB</span>
            </div>

            {/* Quick Sample Trigger */}
            <div className="pt-2" onClick={(e) => e.stopPropagation()}>
              <button
                type="button"
                onClick={handleLoadSample}
                className="inline-flex items-center gap-2 text-xs font-medium text-[#e5ab6e] hover:text-[#f3caa1] bg-[#221c17] hover:bg-[#2e241d] px-3.5 py-1.5 rounded-lg border border-[#6e4622] transition-colors cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Or load sample Nordic A-Frame sketch</span>
              </button>
            </div>
          </div>
        </div>
      ) : (
        /* Preview State */
        <div className="rounded-2xl bg-[#13151f] border border-[#2c3042] p-4 sm:p-5 space-y-4 shadow-xl">
          {/* Header Bar */}
          <div className="flex items-center justify-between border-b border-[#222534] pb-3">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[#22c55e]/15 border border-[#22c55e]/30 flex items-center justify-center text-[#4ade80]">
                <FileCheck className="w-4 h-4" />
              </div>
              <div>
                <p className="text-sm font-bold text-[#fbf9f5] truncate max-w-[200px] sm:max-w-xs">
                  {sketchFile?.name || 'Uploaded Cabin Sketch'}
                </p>
                <p className="text-[11px] text-[#8e8779]">
                  {sketchFile ? `${(sketchFile.size / 1024).toFixed(1)} KB • ${sketchFile.type || 'image'}` : 'Custom Sketch Preview'}
                </p>
              </div>
            </div>

            {/* Actions: Replace & Remove */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleBrowseClick}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#dcd5c9] bg-[#1d202d] hover:bg-[#272b3d] border border-[#30354a] transition-colors cursor-pointer disabled:opacity-50"
                title="Replace with another sketch"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#e5ab6e]" />
                <span className="hidden sm:inline">Replace</span>
              </button>

              <button
                type="button"
                onClick={handleRemove}
                disabled={isUploading}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-[#fca5a5] bg-[#2d1616] hover:bg-[#3d1d1d] border border-[#5c2424] transition-colors cursor-pointer disabled:opacity-50"
                title="Remove image"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Remove</span>
              </button>
            </div>
          </div>

          {/* Image Display */}
          <div className="relative rounded-xl overflow-hidden bg-[#0a0b0e] border border-[#202230] flex items-center justify-center max-h-[360px] sm:max-h-[420px]">
            <img
              src={previewUrl}
              alt="Uploaded Sketch Preview"
              className="w-full h-auto max-h-[360px] sm:max-h-[420px] object-contain p-2"
            />
            
            {/* Status Badges */}
            <div className="absolute bottom-2 left-2 flex items-center gap-2">
              {isUploading ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#13151f]/90 backdrop-blur-sm border border-[#e5ab6e]/40 text-[11px] text-[#e5ab6e]">
                  <Loader2 className="w-3 h-3 animate-spin text-[#e5ab6e]" />
                  <span>Uploading to backend...</span>
                </div>
              ) : imageId ? (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#0c1611]/90 backdrop-blur-sm border border-[#22c55e]/40 text-[11px] text-[#4ade80]">
                  <CheckCircle2 className="w-3 h-3 text-[#22c55e]" />
                  <span>Uploaded &amp; Synced</span>
                </div>
              ) : (
                <div className="px-2.5 py-1 rounded-md bg-[#0c0d12]/80 backdrop-blur-sm border border-[#2b2e3f] text-[11px] text-[#c98a4b] font-mono">
                  Ready for AI Synthesis
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
