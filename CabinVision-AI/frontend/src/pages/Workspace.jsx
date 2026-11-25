import React, { useState, useEffect } from 'react';
import SketchUpload from '../components/SketchUpload';
import CustomizationPanel from '../components/CustomizationPanel';
import GenerateButton from '../components/GenerateButton';
import ResultsComparison from '../components/ResultsComparison';
import { 
  RotateCcw, 
  Layers, 
  Sliders, 
  Eye, 
  HelpCircle,
  Home,
  AlertTriangle,
  Server
} from 'lucide-react';
import { 
  uploadSketch, 
  generateCabin, 
  getAssetUrl, 
  checkBackendHealth, 
  API_BASE_URL 
} from '../services/api';

export default function Workspace({ onNavigateHome }) {
  // Studio form state
  const [sketchFile, setSketchFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [imageId, setImageId] = useState(null);
  const [selectedStyle, setSelectedStyle] = useState('Modern');
  const [selectedMaterials, setSelectedMaterials] = useState(['Wood', 'Glass']);
  const [selectedLighting, setSelectedLighting] = useState('Sunset');
  const [customPrompt, setCustomPrompt] = useState(
    'A-frame cabin nestled beside a misty alpine lake, large double-height panoramic glass facade, wrap-around timber deck with glowing evening hearth'
  );

  // Async operation states
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState(null);

  // Result state
  const [generatedImageUrl, setGeneratedImageUrl] = useState(null);
  const [generatedMetadata, setGeneratedMetadata] = useState(null);

  // View state: 'design' or 'results'
  const [activeView, setActiveView] = useState('design');

  // Backend connectivity state
  const [backendHealth, setBackendHealth] = useState({ checked: false, online: false, data: null });

  useEffect(() => {
    let isMounted = true;
    checkBackendHealth().then((health) => {
      if (isMounted) {
        setBackendHealth({ checked: true, online: health.online, data: health.data });
      }
    });
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle sketch file selection & background upload to Flask backend
  const handleSketchChange = async (file, url) => {
    setSketchFile(file);
    setPreviewUrl(url);
    setImageId(null);
    setUploadError(null);
    setGenerationError(null);
    setGeneratedImageUrl(null);
    setGeneratedMetadata(null);
    setActiveView('design');

    if (!file) return;

    try {
      setIsUploading(true);
      const uploadRes = await uploadSketch(file);
      if (uploadRes.success && uploadRes.image_id) {
        setImageId(uploadRes.image_id);
      }
    } catch (err) {
      console.warn('Backend sketch upload notice:', err);
      const errMsg = err.response?.data?.error || err.message || 'Failed to upload sketch to backend.';
      setUploadError(errMsg);
    } finally {
      setIsUploading(false);
    }
  };

  const handleSketchRemove = () => {
    setSketchFile(null);
    setPreviewUrl(null);
    setImageId(null);
    setUploadError(null);
    setGenerationError(null);
    setGeneratedImageUrl(null);
    setGeneratedMetadata(null);
  };

  const handleResetAll = () => {
    setSketchFile(null);
    setPreviewUrl(null);
    setImageId(null);
    setUploadError(null);
    setGenerationError(null);
    setGeneratedImageUrl(null);
    setGeneratedMetadata(null);
    setSelectedStyle('Modern');
    setSelectedMaterials(['Wood', 'Glass']);
    setSelectedLighting('Sunset');
    setCustomPrompt('');
    setActiveView('design');
  };

  // Main generation handler connecting frontend to /api/generate
  const handleGenerate = async () => {
    if (!sketchFile && !imageId) {
      setGenerationError('Please upload an architectural sketch before generating.');
      return;
    }

    setIsGenerating(true);
    setGenerationError(null);

    try {
      // If imageId wasn't stored yet, attempt upload now
      let currentImageId = imageId;
      if (!currentImageId && sketchFile) {
        setIsUploading(true);
        const uploadRes = await uploadSketch(sketchFile);
        currentImageId = uploadRes.image_id;
        setImageId(currentImageId);
        setIsUploading(false);
      }

      // Call Flask /api/generate
      const genResponse = await generateCabin({
        imageId: currentImageId,
        file: !currentImageId ? sketchFile : undefined,
        style: selectedStyle,
        materials: selectedMaterials,
        lighting: selectedLighting,
        customPrompt: customPrompt,
      });

      if (genResponse.success && genResponse.image_url) {
        const fullUrl = getAssetUrl(genResponse.image_url);
        setGeneratedImageUrl(fullUrl);
        setGeneratedMetadata({
          style: selectedStyle,
          materials: selectedMaterials,
          lighting: selectedLighting,
          customPrompt: customPrompt,
          model: genResponse.metadata?.model || '@cf/black-forest-labs/flux-2-klein-4b',
          generatedFilename: genResponse.generated_filename,
          fileSizeBytes: genResponse.metadata?.file_size_bytes,
        });

        // Automatically switch to side-by-side results view
        setActiveView('results');
      } else {
        throw new Error(genResponse.message || 'Server did not return a valid generated image URL.');
      }
    } catch (err) {
      let errorMsg = 'Failed to generate cabin visualization.';

      if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout')) {
        errorMsg = 'Image generation timed out while waiting for Cloudflare Workers AI. Check the backend status before retrying.';
      } else if (err.code === 'ERR_NETWORK' || err.message?.includes('Network Error')) {
        errorMsg = `Cannot connect to the Flask backend server at ${API_BASE_URL}. Please ensure the backend server is running (python app.py).`;
      } else if (err.response) {
        const status = err.response.status;
        const responseData = err.response.data || {};
        const serverError = responseData.error || responseData.message;
        const errorCode = responseData.error_code;

        if (status === 401 || status === 403) {
          errorMsg = serverError || 'Cloudflare rejected the API token or it lacks Workers AI permissions. Configure CLOUDFLARE_API_TOKEN in backend/.env.';
        } else if (status === 429) {
          if (errorCode === 'daily_allocation_exceeded') {
            errorMsg = serverError || 'Cloudflare Workers AI daily free allocation is exhausted. It resets at 00:00 UTC; check your Workers AI dashboard.';
          } else if (errorCode === 'rate_limit_exceeded') {
            errorMsg = serverError || 'Cloudflare Workers AI rate limit reached. Wait before retrying.';
          } else {
            errorMsg = serverError || 'Cloudflare Workers AI usage limit reached. Check your account quota and daily allocation.';
          }
        } else if (status === 413) {
          errorMsg = 'Uploaded file exceeds the maximum 10 MB limit.';
        } else if (status === 504 || status === 408) {
          errorMsg = serverError || 'Image synthesis timed out. Cloudflare Workers AI took too long to generate the rendering.';
        } else if (serverError) {
          errorMsg = serverError;
        }

        const diagnostics = [
          responseData.error_code && `Code: ${responseData.error_code}`,
          responseData.request_id && `Request ID: ${responseData.request_id}`,
        ].filter(Boolean);
        if (diagnostics.length) {
          errorMsg = `${errorMsg} (${diagnostics.join(' · ')})`;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }

      console.error('Generation request failed', {
        status: err.response?.status,
        errorCode: err.response?.data?.error_code,
        requestId: err.response?.data?.request_id,
      });
      setGenerationError(errorMsg);
    } finally {
      setIsGenerating(false);
      setIsUploading(false);
    }
  };

  return (
    <div className="w-full min-h-screen bg-[#0a0b0e] text-[#ede8df] py-8 sm:py-12 bg-grid-pattern">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        
        {/* Workspace Header & Mode Switcher */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#1f2230]">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onNavigateHome}
                className="inline-flex items-center gap-1.5 text-xs text-[#a79f91] hover:text-[#e5ab6e] transition-colors mr-2 px-2.5 py-1 rounded-md bg-[#161822] border border-[#262939] cursor-pointer"
              >
                <Home className="w-3.5 h-3.5" />
                <span>Overview</span>
              </button>

              <span className="w-2.5 h-2.5 rounded-full bg-[#c98a4b] animate-ping" />
              <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#fbf9f5]">
                Architectural Design Studio
              </h1>
            </div>
            <p className="text-xs sm:text-sm text-[#9e9688]">
              Upload your hand-drawn sketch, define materials, lighting, and style parameters.
            </p>
          </div>

          {/* Mode Switcher, Backend Health Badge & Reset */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Backend Connectivity Status Pill */}
            {backendHealth.checked && (
              <div 
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-mono border ${
                  backendHealth.online
                    ? 'bg-[#0f1f15] text-[#4ade80] border-[#22c55e]/30'
                    : 'bg-[#261313] text-[#fca5a5] border-[#7f1d1d]/40'
                }`}
                title={backendHealth.online ? `Connected to ${API_BASE_URL}` : `Backend unreachable at ${API_BASE_URL}`}
              >
                <Server className="w-3.5 h-3.5" />
                <span>{backendHealth.online ? 'Backend Online' : 'Backend Offline'}</span>
              </div>
            )}

            <div className="flex items-center rounded-xl bg-[#13151f] p-1 border border-[#272b3b]">
              <button
                type="button"
                onClick={() => setActiveView('design')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'design'
                    ? 'bg-[#221c17] text-[#e5ab6e] shadow-sm'
                    : 'text-[#8e8779] hover:text-[#fbf9f5]'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Customization Studio</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveView('results')}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                  activeView === 'results'
                    ? 'bg-[#221c17] text-[#e5ab6e] shadow-sm'
                    : 'text-[#8e8779] hover:text-[#fbf9f5]'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                <span>Results Comparison</span>
                {generatedImageUrl && (
                  <span className="w-2 h-2 rounded-full bg-[#22c55e]" />
                )}
              </button>
            </div>

            <button
              type="button"
              onClick={handleResetAll}
              className="p-2.5 rounded-xl text-[#8e8779] hover:text-[#fbf9f5] bg-[#141620] hover:bg-[#1e212d] border border-[#272b3b] transition-colors cursor-pointer"
              title="Reset all settings and sketch"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Global Error Banner */}
        {generationError && (
          <div className="flex items-start justify-between gap-3 p-4 rounded-xl bg-[#2a1313] border border-[#7f1d1d] text-[#fca5a5] text-xs sm:text-sm animate-fadeIn">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="w-5 h-5 shrink-0 text-[#ef4444] mt-0.5" />
              <div>
                <p className="font-bold text-white">Generation Alert</p>
                <p className="mt-0.5 text-xs text-[#fca5a5] leading-relaxed">{generationError}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setGenerationError(null)}
              className="text-xs text-[#fca5a5] hover:text-white px-2 py-1 rounded bg-[#451414] hover:bg-[#5a1b1b] cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* VIEW 1: Customization & Design Studio */}
        {activeView === 'design' ? (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            
            {/* Left Column: Sketch Upload & Generation Action */}
            <div className="lg:col-span-5 space-y-6">
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-bold text-[#fbf9f5] flex items-center gap-2">
                    <Layers className="w-4 h-4 text-[#c98a4b]" />
                    <span>1. Sketch Input</span>
                  </h3>
                  <span className="text-xs text-[#8e8779]">JPG, PNG under 10 MB</span>
                </div>

                <SketchUpload
                  sketchFile={sketchFile}
                  previewUrl={previewUrl}
                  imageId={imageId}
                  isUploading={isUploading}
                  uploadError={uploadError}
                  onSketchChange={handleSketchChange}
                  onSketchRemove={handleSketchRemove}
                />
              </div>

              {/* Architectural Tips Card */}
              <div className="rounded-2xl p-5 bg-[#12141c] border border-[#232635] space-y-3 text-xs">
                <div className="flex items-center gap-2 text-[#e5ab6e] font-bold">
                  <HelpCircle className="w-4 h-4" />
                  <span>Sketch Preparation Tips</span>
                </div>
                <ul className="space-y-2 text-[#9e9688] list-disc list-inside leading-relaxed">
                  <li>Clear outlines with high contrast yield the most faithful structural silhouette.</li>
                  <li>Annotating roof pitch angles or window zones helps guide the diffusion model.</li>
                  <li>Both rough pencil napkin sketches and polished digital iPad lines are supported.</li>
                </ul>
              </div>

              {/* Generation Button & Status */}
              <div className="pt-2">
                <GenerateButton
                  sketchFile={sketchFile}
                  sketchPreview={previewUrl}
                  imageId={imageId}
                  selectedStyle={selectedStyle}
                  selectedMaterials={selectedMaterials}
                  selectedLighting={selectedLighting}
                  customPrompt={customPrompt}
                  isGenerating={isGenerating}
                  isUploading={isUploading}
                  generationError={generationError}
                  onGenerate={handleGenerate}
                  onProceedToResults={() => setActiveView('results')}
                />
              </div>
            </div>

            {/* Right Column: Customization Controls */}
            <div className="lg:col-span-7 space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-base font-bold text-[#fbf9f5] flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-[#c98a4b]" />
                  <span>2. Architectural Parameters</span>
                </h3>
                <span className="text-xs text-[#e5ab6e] font-medium">Interactive State Sync</span>
              </div>

              <CustomizationPanel
                selectedStyle={selectedStyle}
                onStyleChange={setSelectedStyle}
                selectedMaterials={selectedMaterials}
                onMaterialsChange={setSelectedMaterials}
                selectedLighting={selectedLighting}
                onLightingChange={setSelectedLighting}
                customPrompt={customPrompt}
                onCustomPromptChange={setCustomPrompt}
              />
            </div>

          </div>
        ) : (
          /* VIEW 2: Results Comparison Layout */
          <div className="space-y-6 animate-fadeIn">
            <ResultsComparison
              originalSketchUrl={previewUrl}
              generatedImageUrl={generatedImageUrl}
              metadata={generatedMetadata || {
                style: selectedStyle,
                materials: selectedMaterials,
                lighting: selectedLighting,
                customPrompt: customPrompt,
              }}
              onBackToCustomize={() => setActiveView('design')}
              onGenerateAgain={() => setActiveView('design')}
            />
          </div>
        )}

      </div>
    </div>
  );
}
