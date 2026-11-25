"""
CabinVision AI - Image Processing Module
Stage 3 & 4: OpenCV & Pillow Preprocessing Pipeline

This module provides dedicated, secure, and non-destructive image validation,
inspection, normalization, and preprocessing for architectural sketches.
"""

import os
from typing import Tuple, Optional, Dict, Any
import numpy as np
from PIL import Image, UnidentifiedImageError
import cv2

# Permitted file extensions
ALLOWED_EXTENSIONS = {'jpg', 'jpeg', 'png'}

# Max image dimension for standardizing generative conditioning
DEFAULT_MAX_DIMENSION = 1536
MAX_IMAGE_PIXELS = 16_000_000


def is_allowed_extension(filename: str) -> bool:
    """Check if the given filename has a permitted image extension."""
    if not filename or '.' not in filename:
        return False
    ext = filename.rsplit('.', 1)[1].lower()
    return ext in ALLOWED_EXTENSIONS


def validate_image_stream(file_stream) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """
    Validates whether an incoming file stream represents a real, non-corrupted image.
    Uses Pillow to verify format integrity, dimensions, and header validity.
    
    Returns:
        (is_valid, error_message, metadata)
    """
    if file_stream is None:
        return False, "No file stream provided.", None

    try:
        # Seek to start of stream
        file_stream.seek(0)
        
        # 1. Pillow Verification
        with Image.open(file_stream) as img:
            img.verify()
            
        # Re-seek to start after verify()
        file_stream.seek(0)
        
        # 2. Inspect format, mode, and dimensions
        with Image.open(file_stream) as img:
            format_name = (img.format or "").upper()
            if format_name not in {'JPEG', 'PNG', 'JPG'}:
                return False, f"Unsupported image format: {format_name}. Only JPG, JPEG, and PNG are allowed.", None
                
            width, height = img.size
            if width <= 0 or height <= 0:
                return False, "Invalid image dimensions (zero or negative).", None
            if width > 10000 or height > 10000 or width * height > MAX_IMAGE_PIXELS:
                return False, (
                    f"Image dimensions too large ({width}x{height}). "
                    f"Maximum allowed is 10000 pixels per side and {MAX_IMAGE_PIXELS:,} total pixels."
                ), None

            metadata = {
                "format": format_name,
                "mode": img.mode,
                "width": width,
                "height": height,
                "aspect_ratio": round(width / height, 3),
            }

        # Reset stream position for downstream saving
        file_stream.seek(0)
        return True, None, metadata

    except UnidentifiedImageError:
        return False, "File is not a valid or readable image.", None
    except Exception as exc:
        return False, f"Corrupted or invalid image: {str(exc)}", None


def validate_image_file(file_path: str) -> Tuple[bool, Optional[str], Optional[Dict[str, Any]]]:
    """Validates an image file on disk."""
    if not os.path.exists(file_path):
        return False, "File does not exist on disk.", None

    try:
        with open(file_path, 'rb') as f:
            return validate_image_stream(f)
    except Exception as exc:
        return False, f"Failed to read image file: {str(exc)}", None


def load_image_rgb(file_path: str) -> np.ndarray:
    """
    Loads an image from disk using OpenCV and converts it reliably to an RGB uint8 array.
    Handles grayscale, RGBA transparency blending, and BGR color order.
    """
    if not os.path.exists(file_path):
        raise FileNotFoundError(f"Image not found at path: {file_path}")

    # Read image with original channels (including alpha if present)
    img = cv2.imread(file_path, cv2.IMREAD_UNCHANGED)
    if img is None:
        raise ValueError(f"OpenCV failed to decode image: {file_path}")

    # If 1-channel grayscale -> convert to RGB
    if len(img.shape) == 2 or (len(img.shape) == 3 and img.shape[2] == 1):
        return cv2.cvtColor(img, cv2.COLOR_GRAY2RGB)

    # If 4-channel BGRA -> blend onto white background and convert to RGB
    if len(img.shape) == 3 and img.shape[2] == 4:
        b, g, r, a = cv2.split(img)
        alpha = a.astype(float) / 255.0
        white_bg = np.ones_like(b, dtype=float) * 255.0

        r = (r.astype(float) * alpha + white_bg * (1.0 - alpha)).astype(np.uint8)
        g = (g.astype(float) * alpha + white_bg * (1.0 - alpha)).astype(np.uint8)
        b = (b.astype(float) * alpha + white_bg * (1.0 - alpha)).astype(np.uint8)
        return cv2.merge([r, g, b])

    # If standard 3-channel BGR -> convert to RGB
    if len(img.shape) == 3 and img.shape[2] == 3:
        return cv2.cvtColor(img, cv2.COLOR_BGR2RGB)

    raise ValueError(f"Unexpected image shape: {img.shape}")


def resize_preserve_aspect(image_rgb: np.ndarray, max_dim: int = DEFAULT_MAX_DIMENSION) -> Tuple[np.ndarray, float]:
    """
    Resizes an RGB image while preserving its exact aspect ratio.
    If both dimensions are already smaller than or equal to max_dim, the image is left untouched.
    
    Returns:
        (resized_image, scale_factor)
    """
    h, w = image_rgb.shape[:2]
    if max_dim <= 0:
        return image_rgb, 1.0

    if max(h, w) <= max_dim:
        return image_rgb, 1.0

    scale = max_dim / float(max(h, w))
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))

    # Use INTER_AREA for high-quality downsampling that preserves fine sketch lines
    resized = cv2.resize(image_rgb, (new_w, new_h), interpolation=cv2.INTER_AREA)
    return resized, scale


def apply_light_denoising(image_rgb: np.ndarray) -> np.ndarray:
    """
    Applies light, edge-preserving bilateral filtering to reduce scanner grain or paper texture
    without destroying fine hand-drawn pencil/ink lines or sharp architectural angles.
    """
    denoised = cv2.bilateralFilter(image_rgb, d=5, sigmaColor=35, sigmaSpace=35)
    return denoised


def preprocess_sketch(
    source_path: str,
    output_path: str,
    max_dim: int = DEFAULT_MAX_DIMENSION,
    denoise: bool = False
) -> Dict[str, Any]:
    """
    Full non-destructive preprocessing pipeline for architectural sketches.
    
    1. Validates source image.
    2. Converts grayscale/RGBA to standardized RGB.
    3. Resizes down to max_dim if necessary, preserving exact aspect ratio.
    4. Applies subtle edge-preserving denoising if requested.
    5. Saves the preprocessed sketch to output_path (preserving the original source file untouched).
    
    Returns:
        Metadata dictionary detailing processing statistics.
    """
    # 1. Validate
    is_valid, error, meta = validate_image_file(source_path)
    if not is_valid:
        raise ValueError(f"Image validation failed: {error}")

    # 2. Load RGB
    img_rgb = load_image_rgb(source_path)
    orig_h, orig_w = img_rgb.shape[:2]

    # 3. Resize if needed
    processed_img, scale = resize_preserve_aspect(img_rgb, max_dim=max_dim)
    new_h, new_w = processed_img.shape[:2]

    # 4. Optional subtle denoise
    if denoise:
        processed_img = apply_light_denoising(processed_img)

    # 5. Save output as high-quality PNG to avoid compression artifacts on sketch lines
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    img_bgr = cv2.cvtColor(processed_img, cv2.COLOR_RGB2BGR)
    if not cv2.imwrite(output_path, img_bgr, [cv2.IMWRITE_PNG_COMPRESSION, 3]):
        raise OSError(f"Failed to write preprocessed sketch to: {output_path}")

    return {
        "original_width": orig_w,
        "original_height": orig_h,
        "processed_width": new_w,
        "processed_height": new_h,
        "scale_factor": round(scale, 4),
        "denoised": denoise,
        "output_path": output_path,
        "format": "PNG",
    }


def prepare_sketch_for_image_edit(
    source_path: str,
    output_path: str,
    target_dim: int = 1024
) -> str:
    """
    Prepares a sketch image for image-editing APIs as a square PNG.
    The square canvas keeps the source sketch centered and provides a predictable
    input shape; current GPT Image edit models also support other image dimensions.
    
    This function:
    1. Loads the source image as RGB.
    2. Scales the image while preserving aspect ratio to fit inside target_dim x target_dim.
    3. Centers it on a square canvas with a clean white/neutral background.
    4. Saves as a PNG ready to be sent as an image-editing input.
    
    Returns:
        The output_path of the square PNG.
    """
    img_rgb = load_image_rgb(source_path)
    h, w = img_rgb.shape[:2]

    # Calculate scale to fit inside target_dim x target_dim
    scale = min(target_dim / float(w), target_dim / float(h))
    new_w = max(1, int(round(w * scale)))
    new_h = max(1, int(round(h * scale)))

    resized = cv2.resize(img_rgb, (new_w, new_h), interpolation=cv2.INTER_AREA)

    # Create square canvas with white background (255)
    square_canvas = np.full((target_dim, target_dim, 3), 255, dtype=np.uint8)

    # Center resized image in canvas
    offset_x = (target_dim - new_w) // 2
    offset_y = (target_dim - new_h) // 2
    square_canvas[offset_y:offset_y + new_h, offset_x:offset_x + new_w] = resized

    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    canvas_bgr = cv2.cvtColor(square_canvas, cv2.COLOR_RGB2BGR)
    if not cv2.imwrite(output_path, canvas_bgr, [cv2.IMWRITE_PNG_COMPRESSION, 4]):
        raise OSError(f"Failed to write prepared image-edit input to: {output_path}")

    return output_path
