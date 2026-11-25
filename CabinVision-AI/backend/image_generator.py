"""Cloudflare-backed sketch-to-photorealistic cabin image generation."""

import binascii
import json
import io
import os
import uuid
import base64
import re
import socket
from pathlib import Path
from typing import Dict, Any, List, Optional, Union, Tuple
from datetime import datetime, timezone
from urllib.error import HTTPError, URLError
from urllib.parse import quote
from urllib.request import Request, urlopen

from PIL import Image, UnidentifiedImageError

from image_processor import prepare_sketch_for_image_edit

# Configuration defaults
DEFAULT_IMAGE_MODEL = os.getenv(
    "CLOUDFLARE_IMAGE_MODEL",
    "@cf/black-forest-labs/flux-2-klein-4b",
)
DEFAULT_IMAGE_SIZE = "1024x1024"
CLOUDFLARE_API_BASE_URL = "https://api.cloudflare.com/client/v4/accounts"
CLOUDFLARE_TIMEOUT_SECONDS = 240

# Architectural design dictionaries for prompt synthesis
STYLE_DESCRIPTIONS = {
    "Modern": (
        "Modern contemporary architectural cabin with sharp geometric silhouettes, "
        "expansive floor-to-ceiling panoramic glass curtain walls, clean rooflines, "
        "and sophisticated minimalist architectural framing."
    ),
    "Rustic": (
        "Mountain rustic alpine lodge featuring hand-hewn heavy timber logs, "
        "authentic chinked joinery, rugged fieldstone masonry foundations, "
        "and traditional pitched gables with deep eaves."
    ),
    "Minimalist": (
        "Minimalist architectural cabin with pure geometric volumes, uncluttered planes, "
        "monolithic natural cladding, concealed joints, and seamless transitions into the natural landscape."
    ),
    "Luxury": (
        "High-end luxury architectural cabin retreat featuring premium Western red cedar siding, "
        "expansive cantilevered timber decks, bespoke bronze-trimmed glazing, "
        "integrated exterior ambient accent lighting, and world-class craft finishes."
    ),
    "Scandinavian": (
        "Nordic Scandinavian cabin design with light-toned natural wood siding, "
        "cozy hygge architectural proportions, clean functional simplicity, "
        "and dark standing-seam metal roof accents."
    ),
}

MATERIAL_DESCRIPTIONS = {
    "Wood": (
        "Western Red Cedar and warm Douglas fir timber cladding with distinct natural wood grain, "
        "exposed structural roof beams, and rich honey-toned cedar finishes."
    ),
    "Natural wood": (
        "Natural timber and cedar siding with authentic organic grain textures, "
        "tactile plank details, and natural weather-resistant timber finishes."
    ),
    "Stone": (
        "Natural rugged granite fieldstone and stacked river rock masonry foundations with "
        "three-dimensional depth, weathered mortar joints, and heavy stone chimney accents."
    ),
    "Glass": (
        "Expansive double-height architectural glass curtain walls with ultra-slim matte black "
        "anodized aluminum mullions, reflecting towering alpine trees and surrounding mountain peaks."
    ),
    "Concrete": (
        "Architectural board-formed concrete walls with subtle natural wood grain imprints, "
        "crisp beveled edges, and modern thermal massing."
    ),
    "Mixed": (
        "Harmonious architectural composite of warm vertical timber slats, rugged fieldstone foundations, "
        "and panoramic glass walls creating a balanced natural material palette."
    ),
    "Mixed materials": (
        "Harmonious architectural composite of warm vertical timber slats, rugged fieldstone foundations, "
        "and panoramic glass walls creating a balanced natural material palette."
    ),
}

LIGHTING_DESCRIPTIONS = {
    "Daylight": (
        "Crisp, bright natural alpine morning daylight with clear blue skies, "
        "soft architectural sun shadows, and crystalline clarity highlighting exterior textures."
    ),
    "Natural daylight": (
        "Crisp, bright natural alpine morning daylight with clear blue skies, "
        "soft architectural sun shadows, and crystalline clarity highlighting exterior textures."
    ),
    "Warm": (
        "Warm golden hour illumination, with inviting interior hearth and ambient sconce glow "
        "radiating outward through large glass windows into a tranquil twilight mountain atmosphere."
    ),
    "Warm lighting": (
        "Warm golden hour illumination, with inviting interior hearth and ambient sconce glow "
        "radiating outward through large glass windows into a tranquil twilight mountain atmosphere."
    ),
    "Sunset": (
        "Dramatic sunset alpenglow casting vibrant warm amber and magenta highlights along the timber roofline, "
        "with long cinematic architectural shadows across the surrounding landscape."
    ),
    "Night": (
        "Moody, starry alpine night atmosphere with architectural exterior pin-spot uplighting, "
        "warm glowing interior cabin windows, and a silhouette of pine forest under a clear celestial sky."
    ),
    "Night lighting": (
        "Moody, starry alpine night atmosphere with architectural exterior pin-spot uplighting, "
        "warm glowing interior cabin windows, and a silhouette of pine forest under a clear celestial sky."
    ),
}

# Permitted vocabulary sets
PERMITTED_STYLES = set(STYLE_DESCRIPTIONS.keys())
PERMITTED_MATERIALS = {'Wood', 'Natural wood', 'Stone', 'Glass', 'Concrete', 'Mixed', 'Mixed materials'}
PERMITTED_LIGHTING = set(LIGHTING_DESCRIPTIONS.keys())
MAX_PROMPT_LENGTH = 1000


# -------------------------------------------------------------
# Custom Exception Hierarchy
# -------------------------------------------------------------

class GenerationValidationError(ValueError):
    """Raised when incoming generation parameters fail validation."""
    pass


class GenerationConfigurationError(Exception):
    """Raised when Cloudflare Workers AI credentials are missing."""
    pass


class ImageGenerationError(Exception):
    """Raised when the image provider fails or returns an invalid response."""
    def __init__(
        self,
        message: str,
        status_code: int = 502,
        raw_error: Optional[Exception] = None,
        diagnostics: Optional[Dict[str, Any]] = None,
    ):
        super().__init__(message)
        self.status_code = status_code
        self.raw_error = raw_error
        self.diagnostics = diagnostics or {}


def _cloudflare_error_diagnostics(
    payload: Dict[str, Any],
    headers: Optional[Any] = None,
) -> Dict[str, Optional[str]]:
    errors = payload.get("errors", [])
    first_error = errors[0] if isinstance(errors, list) and errors and isinstance(errors[0], dict) else {}
    message = str(first_error.get("message") or "Cloudflare Workers AI request failed.")
    message = re.sub(r"(?i)(bearer\s+)[A-Za-z0-9._-]+", r"\1[REDACTED]", message)
    request_id = None
    if headers and hasattr(headers, "get"):
        request_id = headers.get("cf-ray") or headers.get("cf-request-id")
    error_code = first_error.get("code")
    return {
        "type": "CloudflareAPIError",
        "code": str(error_code) if error_code is not None else None,
        "message": message,
        "request_id": str(request_id) if request_id else None,
    }


def _map_cloudflare_error(
    status_code: int,
    payload: Dict[str, Any],
    headers: Optional[Any] = None,
    raw_error: Optional[Exception] = None,
) -> ImageGenerationError:
    """Map Cloudflare API responses to safe, actionable application errors."""
    diagnostics = _cloudflare_error_diagnostics(payload, headers)
    message = (diagnostics.get("message") or "").strip()
    search_text = message.lower()

    if status_code in {401, 403}:
        code = "invalid_api_token"
        safe_message = (
            "Cloudflare rejected the API token or it lacks Workers AI permissions. "
            "Set CLOUDFLARE_API_TOKEN in backend/.env with Workers AI Read and Edit permissions."
        )
    elif status_code == 404:
        code = "model_unavailable"
        safe_message = "The configured Cloudflare Workers AI model or account was not found. Check the account ID and model name."
    elif status_code == 429:
        if any(term in search_text for term in ("neuron", "daily", "allocation", "quota")):
            code = "daily_allocation_exceeded"
            safe_message = (
                "The Cloudflare Workers AI daily allocation is exhausted. The free allocation resets at 00:00 UTC; "
                "check your Workers AI dashboard before retrying."
            )
        else:
            code = "rate_limit_exceeded"
            safe_message = "Cloudflare Workers AI rate limit reached. Wait before retrying."
    elif status_code == 400:
        code = "invalid_request"
        safe_message = f"Cloudflare rejected the image request: {message}"
    elif status_code == 504 or isinstance(raw_error, (TimeoutError, socket.timeout)):
        status_code = 504
        code = "request_timeout"
        safe_message = "Cloudflare Workers AI did not return an image before the request timeout."
    elif isinstance(raw_error, URLError):
        status_code = 502
        code = "connection_error"
        safe_message = "Unable to connect to Cloudflare Workers AI. Check network connectivity and service status."
    else:
        status_code = status_code if status_code >= 500 else 502
        code = "provider_error"
        safe_message = "Cloudflare Workers AI image generation failed. Check the provider diagnostics."

    diagnostics["code"] = code
    return ImageGenerationError(
        safe_message,
        status_code=status_code,
        raw_error=raw_error,
        diagnostics=diagnostics,
    )


# -------------------------------------------------------------
# Prompt Engineering
# -------------------------------------------------------------

def build_cabin_prompt(
    cabin_style: str,
    materials: Union[str, List[str]],
    lighting: str,
    custom_prompt: Optional[str] = None
) -> str:
    """
    Constructs a detailed, high-fidelity architectural visualization prompt.
    
    Instructs the model to:
    - Transform the uploaded 2D sketch into a photorealistic architectural visualization photograph.
    - Respect and preserve the primary architectural composition, structural silhouette, roofline gables, and pitch.
    - Retain major positions of doors, windows, walls, and roof depicted in the sketch.
    - Materialize photorealistic textures (timber grain, stone masonry, architectural glass reflections).
    - Establish natural environmental atmosphere (alpine trees, mountain terrain, sky).
    - Maintain professional architectural photography standards with natural depth and fine detail.
    """
    # 1. Style narrative
    style_text = STYLE_DESCRIPTIONS.get(
        cabin_style,
        f"{cabin_style} architectural cabin design with authentic structural form."
    )

    # 2. Materials narrative
    if isinstance(materials, str):
        mat_list = [m.strip() for m in materials.split(",") if m.strip()]
    else:
        mat_list = materials or ["Wood"]

    material_texts = []
    for m in mat_list:
        desc = MATERIAL_DESCRIPTIONS.get(m)
        if desc:
            material_texts.append(desc)
        else:
            material_texts.append(f"Authentic {m} textures.")
    materials_text = " ".join(material_texts)

    # 3. Lighting narrative
    lighting_text = LIGHTING_DESCRIPTIONS.get(
        lighting,
        f"Atmospheric {lighting} lighting conditions with realistic exterior exposure."
    )

    # 4. Custom user prompt
    custom_text = ""
    if custom_prompt and custom_prompt.strip():
        clean_custom = custom_prompt.strip()
        custom_text = f" Architectural specifications and landscape details: {clean_custom}."

    # 5. Full Composite Prompt
    prompt = (
        "Professional architectural visualization photograph of a cabin, transforming the uploaded hand-drawn sketch "
        "into a photorealistic, client-ready exterior rendering. "
        "Preserve the primary architectural composition, structural silhouette, roofline gables, "
        "and relative spatial placement of windows, doors, and walls depicted in the sketch. "
        f"Design Style: {style_text} "
        f"Materials & Textures: {materials_text} "
        f"Atmosphere & Lighting: {lighting_text} "
        "Surrounding Environment: Realistic alpine evergreen forest, natural rocky mountain terrain, "
        "and organic landscaping complementing the cabin foundation. "
        "Cinematic architectural photography, high-resolution detail, photorealistic depth of field, sharp texture focus, "
        "natural physical lighting and glass reflections. Avoid unnecessary changes to the core structural layout."
        f"{custom_text}"
    )

    return prompt


# -------------------------------------------------------------
# Parameter Validation
# -------------------------------------------------------------

def normalize_materials(materials: Union[str, List[str]]) -> List[str]:
    """Normalizes single string or list of materials into a cleaned list."""
    if isinstance(materials, str):
        parts = [m.strip() for m in materials.split(',') if m.strip()]
        return parts if parts else [materials.strip()]
    if isinstance(materials, list):
        return [str(m).strip() for m in materials if str(m).strip()]
    return []


def validate_generation_payload(
    style: Optional[str],
    materials: Optional[Union[str, List[str]]],
    lighting: Optional[str],
    custom_prompt: Optional[str] = None,
    image_id: Optional[str] = None,
    has_uploaded_file: bool = False
) -> Dict[str, Any]:
    """Validates and normalizes architectural parameters for generation."""
    if not image_id and not has_uploaded_file:
        raise GenerationValidationError(
            "Missing sketch image. Provide an 'image_id' of an uploaded sketch or attach a file."
        )

    if not style:
        raise GenerationValidationError("Missing required field: 'style'.")
    matched_style = next((s for s in PERMITTED_STYLES if s.lower() == style.strip().lower()), None)
    if not matched_style:
        raise GenerationValidationError(
            f"Invalid cabin style '{style}'. Permitted options: {sorted(PERMITTED_STYLES)}."
        )

    mat_list = normalize_materials(materials)
    if not mat_list:
        raise GenerationValidationError("Missing required field: 'materials'.")

    normalized_materials = []
    for m in mat_list:
        match = next((pm for pm in PERMITTED_MATERIALS if pm.lower() == m.lower()), None)
        if not match:
            raise GenerationValidationError(
                f"Invalid material '{m}'. Permitted options: {sorted(PERMITTED_MATERIALS)}."
            )
        if match not in normalized_materials:
            normalized_materials.append(match)

    if not lighting:
        raise GenerationValidationError("Missing required field: 'lighting'.")
    matched_lighting = next((l for l in PERMITTED_LIGHTING if l.lower() == lighting.strip().lower()), None)
    if not matched_lighting:
        raise GenerationValidationError(
            f"Invalid lighting '{lighting}'. Permitted options: {sorted(PERMITTED_LIGHTING)}."
        )

    prompt_str = (custom_prompt or "").strip()
    if len(prompt_str) > MAX_PROMPT_LENGTH:
        raise GenerationValidationError(
            f"Custom prompt exceeds max length of {MAX_PROMPT_LENGTH} characters ({len(prompt_str)} provided)."
        )

    return {
        "image_id": image_id,
        "style": matched_style,
        "materials": normalized_materials,
        "lighting": matched_lighting,
        "custom_prompt": prompt_str,
        "status": "ready_for_generation",
    }


# -------------------------------------------------------------
# Cloudflare Workers AI Request & Execution
# -------------------------------------------------------------

def get_cloudflare_config() -> Tuple[str, str, str]:
    """Read Cloudflare Workers AI credentials and model without exposing them."""
    account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
    api_token = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()
    model = os.getenv("CLOUDFLARE_IMAGE_MODEL", DEFAULT_IMAGE_MODEL).strip() or DEFAULT_IMAGE_MODEL
    placeholders = {
        "",
        "your_cloudflare_account_id",
        "your_cloudflare_api_token",
        "replace_with_your_cloudflare_api_token",
    }

    if account_id in placeholders or api_token in placeholders:
        raise GenerationConfigurationError(
            "Cloudflare Workers AI is not configured. Set CLOUDFLARE_ACCOUNT_ID and "
            "CLOUDFLARE_API_TOKEN in backend/.env."
        )

    return account_id, api_token, model


def _request_cloudflare_image(
    account_id: str,
    api_token: str,
    model: str,
    prompt: str,
    image_b64: str,
    width: int,
    height: int,
) -> str:
    endpoint = (
        f"{CLOUDFLARE_API_BASE_URL}/{quote(account_id, safe='')}/ai/run/"
        f"{quote(model, safe='@/-._')}"
    )
    request_fields = {
        "prompt": prompt,
        "image_b64": image_b64,
        "width": width,
        "height": height,
        "strength": 0.75,
    }
    boundary = f"----CabinVisionAI{uuid.uuid4().hex}"
    boundary_bytes = boundary.encode("ascii")
    multipart_parts: List[bytes] = []
    for field_name, field_value in request_fields.items():
        multipart_parts.extend([
            b"--" + boundary_bytes + b"\r\n",
            f'Content-Disposition: form-data; name="{field_name}"\r\n\r\n'.encode("ascii"),
            str(field_value).encode("utf-8"),
            b"\r\n",
        ])
    multipart_parts.append(b"--" + boundary_bytes + b"--\r\n")
    request = Request(
        endpoint,
        data=b"".join(multipart_parts),
        headers={
            "Accept": "application/json",
            "Authorization": f"Bearer {api_token}",
            "Content-Type": f"multipart/form-data; boundary={boundary}",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=CLOUDFLARE_TIMEOUT_SECONDS) as response:
            response_payload = json.loads(response.read())
            if not isinstance(response_payload, dict):
                raise ImageGenerationError(
                    "Cloudflare returned an invalid image response.",
                    status_code=502,
                    diagnostics={"type": "invalid_response", "code": "invalid_response"},
                )
            if not response_payload.get("success", False):
                raise _map_cloudflare_error(
                    response.status,
                    response_payload,
                    response.headers,
                )
    except HTTPError as error:
        try:
            error_payload = json.loads(error.read())
        except (json.JSONDecodeError, UnicodeDecodeError):
            error_payload = {}
        raise _map_cloudflare_error(
            error.code,
            error_payload if isinstance(error_payload, dict) else {},
            error.headers,
            raw_error=error,
        ) from error
    except (TimeoutError, socket.timeout) as error:
        raise _map_cloudflare_error(504, {}, raw_error=error) from error
    except URLError as error:
        raise _map_cloudflare_error(502, {}, raw_error=error) from error
    except (json.JSONDecodeError, UnicodeDecodeError) as error:
        raise ImageGenerationError(
            "Cloudflare returned a response that was not valid JSON.",
            status_code=502,
            raw_error=error,
            diagnostics={"type": "invalid_response", "code": "invalid_json"},
        ) from error

    result = response_payload.get("result")
    image_b64_result = result.get("image") if isinstance(result, dict) else None
    if not isinstance(image_b64_result, str) or not image_b64_result:
        raise ImageGenerationError(
            "Cloudflare returned no generated image. Try again after checking your Workers AI usage.",
            status_code=502,
            diagnostics={"type": "invalid_response", "code": "missing_image"},
        )
    return image_b64_result


def generate_cabin_image(
    sketch_path: str,
    cabin_style: str,
    material: Optional[Union[str, List[str]]] = None,
    lighting: str = "Sunset",
    custom_prompt: Optional[str] = None,
    materials: Optional[Union[str, List[str]]] = None,
    output_dir: Optional[str] = None,
    image_size: Optional[str] = None
) -> Dict[str, Any]:
    """
    Generates a photorealistic cabin rendering using Cloudflare Workers AI.
    
    Args:
        sketch_path: Path to the validated source sketch on disk.
        cabin_style: Architectural style preset (Modern, Rustic, Minimalist, Luxury, Scandinavian).
        material: Selected building material(s) (Wood, Stone, Glass, Concrete, Mixed).
        lighting: Lighting atmosphere (Daylight, Warm, Sunset, Night).
        custom_prompt: Optional user instructions.
        materials: Alternate plural keyword for building material(s).
        output_dir: Directory where the generated rendering will be saved.
        image_size: Desired square image size ('1024x1024', '1K', '2048x2048', or '2K').
        
    Returns:
        Dictionary containing filename, relative URL, metadata, and prompt details.
        
    Raises:
        GenerationConfigurationError: Missing Cloudflare credentials.
        ImageGenerationError: API error, rate limit, timeout, or decoding failure.
    """
    # 1. Verify sketch exists
    if not os.path.exists(sketch_path):
        raise FileNotFoundError(f"Source sketch file does not exist at: {sketch_path}")

    # Resolve material(s) parameter
    chosen_materials = material if material is not None else materials
    if chosen_materials is None:
        chosen_materials = ["Wood"]

    # 2. Read provider configuration without logging credentials
    account_id, api_token, model = get_cloudflare_config()

    # 3. Build architectural prompt
    prompt = build_cabin_prompt(
        cabin_style=cabin_style,
        materials=chosen_materials,
        lighting=lighting,
        custom_prompt=custom_prompt,
    )

    # 4. Prepare target output directory
    target_dir = Path(output_dir) if output_dir else Path(__file__).resolve().parent / "generated"
    target_dir.mkdir(parents=True, exist_ok=True)

    # 5. Prepare the sketch for the Cloudflare image-edit request
    chosen_size = image_size or DEFAULT_IMAGE_SIZE
    dimensions = {
        "1024x1024": 1024,
        "1K": 1024,
        "2048x2048": 2048,
        "2K": 2048,
    }.get(chosen_size)
    if not dimensions:
        raise ImageGenerationError(
            "Unsupported image size. Cloudflare FLUX.2 Klein supports square outputs up to 2048x2048.",
            status_code=400,
            diagnostics={"type": "invalid_request", "code": "invalid_image_size"},
        )

    temp_edit_path = target_dir / f"edit_prep_{uuid.uuid4().hex[:8]}.png"

    try:
        prepare_sketch_for_image_edit(sketch_path, str(temp_edit_path), target_dim=1024)
        with Image.open(temp_edit_path) as prepared_image:
            jpeg_buffer = io.BytesIO()
            prepared_image.convert("RGB").save(
                jpeg_buffer,
                format="JPEG",
                quality=90,
                optimize=True,
            )
            encoded_sketch = base64.b64encode(jpeg_buffer.getvalue()).decode("ascii")
    except Exception as prep_err:
        try:
            temp_edit_path.unlink(missing_ok=True)
        except OSError:
            pass
        raise ImageGenerationError(
            "Unable to prepare the sketch for Cloudflare image editing.",
            status_code=500,
            raw_error=prep_err,
        ) from prep_err

    # 6. Send the sketch and architectural prompt to Cloudflare
    try:
        generated_b64 = _request_cloudflare_image(
            account_id=account_id,
            api_token=api_token,
            model=model,
            prompt=prompt,
            image_b64=encoded_sketch,
            width=dimensions,
            height=dimensions,
        )
    finally:
        try:
            temp_edit_path.unlink(missing_ok=True)
        except OSError:
            pass

    # 7. Validate and decode the image response
    try:
        raw_image_bytes = base64.b64decode(generated_b64, validate=True)
        with Image.open(io.BytesIO(raw_image_bytes)) as generated_image:
            if generated_image.format not in {"JPEG", "PNG"}:
                raise ValueError("Cloudflare response was not a supported image format.")
            generated_image.load()
            png_image = generated_image.convert(
                "RGBA" if "A" in generated_image.getbands() else "RGB"
            )
            png_buffer = io.BytesIO()
            png_image.save(png_buffer, format="PNG")
            raw_image_bytes = png_buffer.getvalue()
    except (binascii.Error, TypeError, ValueError, UnidentifiedImageError, OSError) as decode_err:
        raise ImageGenerationError(
            "Cloudflare returned image data that could not be decoded as JPEG or PNG.",
            status_code=502,
            raw_error=decode_err,
            diagnostics={"type": "invalid_response", "code": "invalid_image_data"},
        ) from decode_err

    # 8. Save generated image with a unique filename
    unique_id = str(uuid.uuid4())
    clean_style = "".join(c for c in cabin_style if c.isalnum()).lower()
    output_filename = f"cabin_render_{clean_style}_{unique_id}.png"
    output_filepath = target_dir / output_filename
    temporary_output = output_filepath.with_suffix(".png.tmp")

    try:
        with open(temporary_output, "xb") as f_out:
            f_out.write(raw_image_bytes)
        os.replace(temporary_output, output_filepath)
    finally:
        temporary_output.unlink(missing_ok=True)

    file_size_bytes = os.path.getsize(output_filepath)

    return {
        "success": True,
        "generated_filename": output_filename,
        "image_url": f"/api/generated/{output_filename}",
        "filepath": str(output_filepath),
        "file_size_bytes": file_size_bytes,
        "model": model,
        "size": chosen_size,
        "prompt": prompt,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
