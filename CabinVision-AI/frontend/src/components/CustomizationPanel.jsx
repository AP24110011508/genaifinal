import React from 'react';
import { 
  Building2, 
  Flame, 
  Crown, 
  Trees, 
  Layers, 
  Sun, 
  Sunset, 
  Moon, 
  SunDim, 
  Wand2 
} from 'lucide-react';
import { CABIN_STYLES, MATERIALS, LIGHTING_CONDITIONS } from '../services/api';

const STYLE_ICONS = {
  Modern: Building2,
  Rustic: Flame,
  Minimalist: Layers,
  Luxury: Crown,
  Scandinavian: Trees,
};

const LIGHTING_ICONS = {
  Daylight: Sun,
  Warm: SunDim,
  Sunset: Sunset,
  Night: Moon,
};

const QUICK_PROMPT_TAGS = [
  'Nestled by a reflective glacial alpine lake',
  'Surrounded by towering snow-dusted pines',
  'Wrap-around Western red cedar deck',
  'Standing seam matte charcoal metal roof',
  'Outdoor sunken fire pit & Adirondack chairs',
  'Floor-to-ceiling double-height glass facade',
];

export default function CustomizationPanel({
  selectedStyle,
  onStyleChange,
  selectedMaterials,
  onMaterialsChange,
  selectedLighting,
  onLightingChange,
  customPrompt,
  onCustomPromptChange,
}) {

  // Toggle material in multi-selection or switch
  const handleMaterialToggle = (materialId) => {
    if (materialId === 'Mixed') {
      onMaterialsChange(['Mixed']);
      return;
    }

    let updated = selectedMaterials.filter(m => m !== 'Mixed');
    if (updated.includes(materialId)) {
      if (updated.length > 1) {
        updated = updated.filter(m => m !== materialId);
      }
    } else {
      updated = [...updated, materialId];
    }
    onMaterialsChange(updated);
  };

  const addPromptTag = (tag) => {
    if (!customPrompt) {
      onCustomPromptChange(tag);
    } else if (!customPrompt.includes(tag)) {
      onCustomPromptChange(`${customPrompt.trim()}, ${tag}`);
    }
  };

  return (
    <div className="space-y-8 p-6 sm:p-7 rounded-2xl bg-[#13151f] border border-[#272b3b] shadow-xl">
      
      {/* 1. Cabin Style Section */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-[#fbf9f5] flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#c98a4b]/20 text-[#e5ab6e] flex items-center justify-center text-xs font-mono">1</span>
            <span>Architectural Cabin Style</span>
          </label>
          <span className="text-xs text-[#e5ab6e] font-semibold">{selectedStyle}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
          {CABIN_STYLES.map((style) => {
            const Icon = STYLE_ICONS[style.id] || Building2;
            const isSelected = selectedStyle === style.id;
            return (
              <button
                type="button"
                key={style.id}
                onClick={() => onStyleChange(style.id)}
                className={`p-3 rounded-xl text-left border transition-all duration-200 cursor-pointer flex flex-col justify-between group ${
                  isSelected
                    ? 'bg-[#221c17] border-[#e5ab6e] text-white shadow-lg shadow-[#c98a4b]/15 ring-1 ring-[#e5ab6e]'
                    : 'bg-[#181a25] border-[#292c3c] hover:border-[#3e4359] text-[#a79f91] hover:text-[#fbf9f5]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className={`p-1.5 rounded-lg ${isSelected ? 'bg-[#e5ab6e] text-[#121319]' : 'bg-[#212433] text-[#c98a4b] group-hover:scale-105'} transition-all`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  {isSelected && (
                    <span className="w-2 h-2 rounded-full bg-[#e5ab6e]" />
                  )}
                </div>
                <div>
                  <p className="text-xs font-bold text-[#fbf9f5]">{style.name}</p>
                  <p className="text-[10px] text-[#8e8779] line-clamp-2 mt-0.5 leading-snug">{style.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Materials Selection */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-[#fbf9f5] flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#c98a4b]/20 text-[#e5ab6e] flex items-center justify-center text-xs font-mono">2</span>
            <span>Primary Building Materials</span>
          </label>
          <span className="text-xs text-[#8e8779]">Select one or multiple</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {MATERIALS.map((mat) => {
            const isSelected = selectedMaterials.includes(mat.id);
            return (
              <button
                type="button"
                key={mat.id}
                onClick={() => handleMaterialToggle(mat.id)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer ${
                  isSelected
                    ? 'bg-[#1f1d1c] border-[#e5ab6e] text-white shadow-md shadow-[#c98a4b]/10'
                    : 'bg-[#181a25] border-[#292c3c] hover:border-[#3e4359] text-[#a79f91]'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[#fbf9f5]">{mat.name}</span>
                  <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                    isSelected ? 'border-[#e5ab6e] bg-[#e5ab6e]' : 'border-[#3f4356]'
                  }`}>
                    {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-[#121319]" />}
                  </div>
                </div>
                <p className="text-[10px] text-[#8e8779] line-clamp-1 mt-1">{mat.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. Lighting & Atmosphere */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-[#fbf9f5] flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#c98a4b]/20 text-[#e5ab6e] flex items-center justify-center text-xs font-mono">3</span>
            <span>Lighting &amp; Time of Day</span>
          </label>
          <span className="text-xs text-[#e5ab6e] font-semibold">{selectedLighting}</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {LIGHTING_CONDITIONS.map((light) => {
            const Icon = LIGHTING_ICONS[light.id] || Sun;
            const isSelected = selectedLighting === light.id;
            return (
              <button
                type="button"
                key={light.id}
                onClick={() => onLightingChange(light.id)}
                className={`p-3 rounded-xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-3 ${
                  isSelected
                    ? 'bg-[#221c17] border-[#e5ab6e] text-white shadow-md shadow-[#c98a4b]/15'
                    : 'bg-[#181a25] border-[#292c3c] hover:border-[#3e4359] text-[#a79f91]'
                }`}
              >
                <div className={`p-2 rounded-lg ${
                  isSelected ? 'bg-[#e5ab6e] text-[#121319]' : 'bg-[#212433] text-[#c98a4b]'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-bold text-[#fbf9f5]">{light.name}</p>
                  <p className="text-[10px] text-[#8e8779]">{light.desc.split(',')[0]}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. Custom Architectural Prompt */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-bold text-[#fbf9f5] flex items-center gap-2">
            <span className="w-5 h-5 rounded-md bg-[#c98a4b]/20 text-[#e5ab6e] flex items-center justify-center text-xs font-mono">4</span>
            <span>Custom Architectural Prompt</span>
            <span className="text-xs font-normal text-[#8e8779]">(Optional)</span>
          </label>
          <span className="text-xs text-[#8e8779] font-mono">
            {customPrompt.length} / 500
          </span>
        </div>

        <div className="relative">
          <textarea
            rows={3}
            maxLength={500}
            value={customPrompt}
            onChange={(e) => onCustomPromptChange(e.target.value)}
            placeholder="e.g. Nestled in dense pine forest beside a misty alpine lake, expansive floor-to-ceiling glass, wrap-around cedar deck, matte black metal roof, glowing evening hearth..."
            className="w-full rounded-xl bg-[#0e1017] border border-[#292c3c] focus:border-[#e5ab6e] focus:ring-1 focus:ring-[#e5ab6e] p-3.5 text-sm text-[#fbf9f5] placeholder-[#5f594f] outline-none transition-all resize-none"
          />
        </div>

        {/* Quick prompt addition chips */}
        <div className="space-y-1.5">
          <div className="flex items-center gap-1.5 text-[11px] text-[#8e8779]">
            <Wand2 className="w-3 h-3 text-[#e5ab6e]" />
            <span>Suggested Details:</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {QUICK_PROMPT_TAGS.map((tag, idx) => (
              <button
                type="button"
                key={idx}
                onClick={() => addPromptTag(tag)}
                className="text-[11px] text-[#a79f91] hover:text-[#fbf9f5] bg-[#181a25] hover:bg-[#232737] border border-[#2b2f42] px-2.5 py-1 rounded-md transition-colors cursor-pointer"
              >
                + {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

    </div>
  );
}
