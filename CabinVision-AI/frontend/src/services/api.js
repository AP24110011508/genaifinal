import axios from 'axios';

/**
 * CabinVision AI - API Client Service
 * Stage 5: End-to-end communication with Flask backend
 */

export const API_BASE_URL =
  (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) ||
  (typeof import.meta !== 'undefined' && import.meta.env?.DEV ? 'http://localhost:5001' : '');

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000, // 120 seconds timeout for AI generative vision processing
  headers: {
    'Accept': 'application/json',
  },
});

// Architectural constants aligned with backend vocabulary
export const CABIN_STYLES = [
  { id: 'Modern', name: 'Modern', desc: 'Sleek geometric lines, floor-to-ceiling glass, mono-pitch roofs' },
  { id: 'Rustic', name: 'Rustic', desc: 'Hand-hewn timber, raw stone accents, traditional pitched gables' },
  { id: 'Minimalist', name: 'Minimalist', desc: 'Monolithic volumes, uncluttered planes, seamless natural finishes' },
  { id: 'Luxury', name: 'Luxury', desc: 'Expansive cantilevered decks, infinity features, premium timber & bronze' },
  { id: 'Scandinavian', name: 'Scandinavian', desc: 'Nordic light woods, cozy hygge warmth, functional organic forms' },
];

export const MATERIALS = [
  { id: 'Wood', name: 'Wood', desc: 'Western Red Cedar, charred Shou Sugi Ban & Douglas fir' },
  { id: 'Stone', name: 'Stone', desc: 'Rugged granite fieldstone, slate foundation & river rock' },
  { id: 'Glass', name: 'Glass', desc: 'Expansive curtain walls with slim black anodized mullions' },
  { id: 'Concrete', name: 'Concrete', desc: 'Architectural board-formed concrete & thermal massing' },
  { id: 'Mixed', name: 'Mixed', desc: 'Balanced composite of timber framing, masonry & panoramic glazing' },
];

export const LIGHTING_CONDITIONS = [
  { id: 'Daylight', name: 'Daylight', desc: 'Crisp alpine morning sun, sharp architectural shadows' },
  { id: 'Warm', name: 'Warm', desc: 'Golden hearth glow radiating through glass at twilight' },
  { id: 'Sunset', name: 'Sunset', desc: 'Vibrant alpenglow with amber highlights along timber beams' },
  { id: 'Night', name: 'Night', desc: 'Moody starry sky with dramatic exterior accent sconces' },
];

export const UPLOAD_LIMITS = {
  MAX_FILE_SIZE_BYTES: 10 * 1024 * 1024, // 10 MB
  MAX_FILE_SIZE_MB: 10,
  ACCEPTED_TYPES: ['image/jpeg', 'image/jpg', 'image/png'],
  ACCEPTED_EXTENSIONS: ['.jpg', '.jpeg', '.png'],
};

/**
 * Validates an uploaded sketch file against size and type constraints.
 * @param {File} file - The candidate file from drag-drop or file input
 * @returns {{ valid: boolean, error: string | null }}
 */
export function validateSketchFile(file) {
  if (!file) {
    return { valid: false, error: 'No file selected.' };
  }

  const isValidType = UPLOAD_LIMITS.ACCEPTED_TYPES.includes(file.type.toLowerCase()) ||
    /\.(jpe?g|png)$/i.test(file.name);

  if (!isValidType) {
    return {
      valid: false,
      error: `Unsupported file type (${file.type || 'unknown'}). Please upload a JPG, JPEG, or PNG image.`,
    };
  }

  if (file.size > UPLOAD_LIMITS.MAX_FILE_SIZE_BYTES) {
    const sizeInMB = (file.size / (1024 * 1024)).toFixed(2);
    return {
      valid: false,
      error: `File size exceeds 10 MB limit (${sizeInMB} MB). Please choose a smaller sketch image.`,
    };
  }

  return { valid: true, error: null };
}

/**
 * Formats a relative server path into an absolute asset URL.
 */
export function getAssetUrl(path) {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('blob:') || path.startsWith('data:')) {
    return path;
  }
  const cleanBase = API_BASE_URL.replace(/\/+$/, '');
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  return `${cleanBase}${cleanPath}`;
}

/**
 * Health check endpoint for Flask backend
 */
export async function checkBackendHealth() {
  try {
    const response = await apiClient.get('/api/health');
    return { online: true, data: response.data };
  } catch (error) {
    return {
      online: false,
      error: error.response?.data?.error || error.message || 'Backend server unreachable.',
    };
  }
}

/**
 * Uploads an architectural sketch to the Flask backend (/api/upload).
 * @param {File} file - Validated sketch image
 * @param {Function} [onProgress] - Optional progress callback
 * @returns {Promise<{ success: boolean, image_id: string, filename: string, dimensions: object }>}
 */
export async function uploadSketch(file, onProgress = null) {
  const validation = validateSketchFile(file);
  if (!validation.valid) {
    throw new Error(validation.error);
  }

  const formData = new FormData();
  formData.append('file', file);

  const response = await apiClient.post('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    onUploadProgress: (progressEvent) => {
      if (onProgress && progressEvent.total) {
        const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
        onProgress(percent);
      }
    },
  });

  return response.data;
}

/**
 * Dispatches a generation request to the Flask backend (/api/generate).
 * @param {object} params
 * @param {string} [params.imageId] - Identifier returned by uploadSketch
 * @param {File} [params.file] - Direct file fallback if upload wasn't pre-completed
 * @param {string} params.style - Cabin style preset
 * @param {string[]} params.materials - Building materials array
 * @param {string} params.lighting - Lighting condition
 * @param {string} [params.customPrompt] - User architectural details
 * @returns {Promise<{ success: boolean, generated_filename: string, image_url: string, metadata: object }>}
 */
export async function generateCabin({ imageId, file, style, materials, lighting, customPrompt }) {
  if (!imageId && !file) {
    throw new Error('Please upload a sketch before generating a cabin visualization.');
  }

  // If we have imageId, use clean JSON request
  if (imageId) {
    const payload = {
      image_id: imageId,
      style: style || 'Modern',
      materials: Array.isArray(materials) ? materials : [materials || 'Wood'],
      lighting: lighting || 'Daylight',
      custom_prompt: (customPrompt || '').trim(),
    };

    const response = await apiClient.post('/api/generate', payload, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 300000,
    });

    return response.data;
  }

  // Fallback to direct multipart submission
  const formData = new FormData();
  formData.append('file', file);
  formData.append('style', style || 'Modern');
  const matList = Array.isArray(materials) ? materials : [materials || 'Wood'];
  matList.forEach((m) => formData.append('materials', m));
  formData.append('lighting', lighting || 'Daylight');
  if (customPrompt) {
    formData.append('custom_prompt', customPrompt.trim());
  }

  const response = await apiClient.post('/api/generate', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 300000,
  });

  return response.data;
}

/**
 * Builds the standard Generation Request payload for local inspection/verification.
 */
export function buildGenerationPayload({ file, imageId, style, materials, lighting, customPrompt }) {
  return {
    imageId: imageId || null,
    fileMetadata: file ? {
      name: file.name,
      size: file.size,
      formattedSize: `${(file.size / 1024).toFixed(1)} KB`,
      type: file.type,
      lastModified: file.lastModified,
    } : null,
    style: style || 'Modern',
    materials: Array.isArray(materials) ? materials : [materials || 'Wood'],
    lighting: lighting || 'Daylight',
    customPrompt: (customPrompt || '').trim(),
    endpoint: `${API_BASE_URL}/api/generate`,
    timestamp: new Date().toISOString(),
  };
}
