"""
CabinVision AI - Flask Backend Application
Stage 4: Cloudflare Workers AI Integration, Secure Uploads & Visualizations

Provides:
- GET  /api/health            System readiness and health check
- POST /api/upload            Ingest, validate, and preprocess architectural sketches
- POST /api/generate          Generate photorealistic cabin rendering using Cloudflare Workers AI
- GET  /api/uploads/<id>      Safely retrieve stored original sketch image
- GET  /api/generated/<id>    Safely retrieve AI-generated cabin visualization
"""

import os
import uuid
import logging
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, Any

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from werkzeug.utils import secure_filename
from werkzeug.exceptions import RequestEntityTooLarge, NotFound, BadRequest
from dotenv import load_dotenv

# Load secrets and local configuration only from this backend's .env file.
load_dotenv(dotenv_path=Path(__file__).resolve().parent / ".env")

from image_processor import (
    is_allowed_extension,
    validate_image_stream,
    preprocess_sketch,
    ALLOWED_EXTENSIONS,
)
from image_generator import (
    validate_generation_payload,
    generate_cabin_image,
    GenerationValidationError,
    GenerationConfigurationError,
    ImageGenerationError,
    DEFAULT_IMAGE_MODEL,
)

logger = logging.getLogger(__name__)

# Configuration defaults
BASE_DIR = Path(__file__).resolve().parent
DATA_DIR = (
    Path(os.getenv("TMPDIR", "/tmp")) / "cabinvision-ai"
    if os.getenv("VERCEL")
    else BASE_DIR
)
UPLOAD_DIR = DATA_DIR / os.getenv("UPLOAD_FOLDER", "uploads")
GENERATED_DIR = DATA_DIR / os.getenv("GENERATED_FOLDER", "generated")
PREPROCESSED_DIR = GENERATED_DIR / "preprocessed"
MAX_CONTENT_LENGTH = int(os.getenv("MAX_CONTENT_LENGTH", 10 * 1024 * 1024))  # 10 MB default


def create_app(test_config: Dict[str, Any] = None) -> Flask:
    """Application factory for CabinVision AI Flask Backend."""
    app = Flask(__name__)

    # Default configuration
    app.config.update(
        MAX_CONTENT_LENGTH=MAX_CONTENT_LENGTH,
        UPLOAD_FOLDER=str(UPLOAD_DIR),
        GENERATED_FOLDER=str(GENERATED_DIR),
        PREPROCESSED_FOLDER=str(PREPROCESSED_DIR),
        JSON_SORT_KEYS=False,
    )

    if test_config:
        app.config.update(test_config)

    # Ensure required directories exist
    os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
    os.makedirs(app.config["GENERATED_FOLDER"], exist_ok=True)
    os.makedirs(app.config["PREPROCESSED_FOLDER"], exist_ok=True)

    cors_origins = [
        origin.strip()
        for origin in os.getenv(
            "CORS_ORIGINS",
            "http://localhost:5173,http://127.0.0.1:5173,http://localhost:5174,http://127.0.0.1:5174",
        ).split(",")
        if origin.strip()
    ]

    # Configure Cross-Origin Resource Sharing for the local React development server.
    CORS(
        app,
        resources={r"/api/*": {"origins": cors_origins}},
        supports_credentials=False,
        methods=["GET", "POST", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization", "Accept"],
    )

    # ---------------------------------------------------------
    # Global Error Handlers (Consistent JSON Responses)
    # ---------------------------------------------------------

    @app.errorhandler(413)
    @app.errorhandler(RequestEntityTooLarge)
    def handle_file_too_large(error):
        return jsonify({
            "success": False,
            "error": "File size exceeds maximum allowed limit of 10 MB.",
            "status_code": 413,
        }), 413

    @app.errorhandler(400)
    @app.errorhandler(BadRequest)
    def handle_bad_request(error):
        return jsonify({
            "success": False,
            "error": getattr(error, "description", "Bad Request"),
            "status_code": 400,
        }), 400

    @app.errorhandler(404)
    @app.errorhandler(NotFound)
    def handle_not_found(error):
        return jsonify({
            "success": False,
            "error": getattr(error, "description", "Resource not found"),
            "status_code": 404,
        }), 404

    @app.errorhandler(500)
    def handle_internal_server_error(error):
        # Do not expose internal traceback or server paths
        return jsonify({
            "success": False,
            "error": "An internal server error occurred. Please try again later.",
            "status_code": 500,
        }), 500

    # ---------------------------------------------------------
    # API Routes
    # ---------------------------------------------------------

    @app.route("/api/health", methods=["GET"])
    def health_check():
        """
        System readiness & health check endpoint.
        Returns status and availability without exposing sensitive keys or credentials.
        """
        account_id = os.getenv("CLOUDFLARE_ACCOUNT_ID", "").strip()
        api_token = os.getenv("CLOUDFLARE_API_TOKEN", "").strip()
        invalid_placeholders = {
            "",
            "your_cloudflare_account_id",
            "your_cloudflare_api_token",
            "replace_with_your_cloudflare_api_token",
        }
        is_configured = (
            account_id not in invalid_placeholders
            and api_token not in invalid_placeholders
        )
        image_model = os.getenv("CLOUDFLARE_IMAGE_MODEL", DEFAULT_IMAGE_MODEL).strip() or DEFAULT_IMAGE_MODEL

        return jsonify({
            "success": True,
            "status": "healthy",
            "backend": "CabinVision AI Backend",
            "version": "1.0.0",
            "stage": "Stage 4 - Cloudflare Workers AI Image Generation",
            "provider": "Cloudflare Workers AI",
            "api_ready": is_configured,
            "cloudflare_configured": is_configured,
            "image_model": image_model,
            "max_upload_size_mb": app.config["MAX_CONTENT_LENGTH"] / (1024 * 1024),
            "allowed_extensions": sorted(ALLOWED_EXTENSIONS),
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }), 200

    @app.route("/api/upload", methods=["POST"])
    def upload_sketch():
        """
        Upload and validate an architectural sketch image.
        Accepts: multipart/form-data with file field 'file' (or 'sketch' / 'image').
        Validates format, size, and content integrity before saving to disk.
        """
        file_obj = None
        for key in ["file", "sketch", "image"]:
            if key in request.files:
                file_obj = request.files[key]
                break

        if not file_obj or not file_obj.filename:
            return jsonify({
                "success": False,
                "error": "No file uploaded. Please provide an image file under the 'file' field.",
                "status_code": 400,
            }), 400

        original_filename = secure_filename(file_obj.filename)
        if not original_filename:
            return jsonify({
                "success": False,
                "error": "Invalid or empty filename provided.",
                "status_code": 400,
            }), 400

        if not is_allowed_extension(original_filename):
            return jsonify({
                "success": False,
                "error": f"Unsupported file extension. Allowed formats are: {sorted(ALLOWED_EXTENSIONS)}.",
                "status_code": 400,
            }), 400

        is_valid, error_msg, meta = validate_image_stream(file_obj.stream)
        if not is_valid:
            return jsonify({
                "success": False,
                "error": error_msg or "Invalid image file.",
                "status_code": 400,
            }), 400

        unique_id = str(uuid.uuid4())
        safe_filename = f"{unique_id}_{original_filename}"
        saved_path = os.path.join(app.config["UPLOAD_FOLDER"], safe_filename)

        # Save original file
        file_obj.save(saved_path)
        file_size_bytes = os.path.getsize(saved_path)

        # Preprocess sketch (normalized copy saved in preprocessed folder)
        preprocessed_filename = f"{unique_id}_normalized.png"
        preprocessed_path = os.path.join(app.config["PREPROCESSED_FOLDER"], preprocessed_filename)

        try:
            prep_stats = preprocess_sketch(
                source_path=saved_path,
                output_path=preprocessed_path,
                max_dim=1536,
                denoise=False,
            )
        except Exception as exc:
            if os.path.exists(saved_path):
                os.remove(saved_path)
            return jsonify({
                "success": False,
                "error": f"Image preprocessing failed: {str(exc)}",
                "status_code": 400,
            }), 400

        return jsonify({
            "success": True,
            "message": "Sketch uploaded, validated, and preprocessed successfully.",
            "image_id": safe_filename,
            "filename": original_filename,
            "size_bytes": file_size_bytes,
            "dimensions": {
                "width": meta.get("width"),
                "height": meta.get("height"),
                "aspect_ratio": meta.get("aspect_ratio"),
            },
            "format": meta.get("format"),
            "preprocessed_id": preprocessed_filename,
            "preprocessing": prep_stats,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }), 201

    @app.route("/api/generate", methods=["POST"])
    def generate_cabin():
        """
        Generate photorealistic cabin architectural visualization using Cloudflare Workers AI.
        Accepts: JSON or multipart/form-data.
        """
        # Extract inputs from JSON or Form Data
        if request.is_json:
            data = request.get_json() or {}
            uploaded_file = None
        else:
            data = request.form.to_dict()
            uploaded_file = request.files.get("file") or request.files.get("sketch")

        image_id = data.get("image_id")
        style = data.get("style")
        materials = data.get("materials") if request.is_json else request.form.getlist("materials")
        lighting = data.get("lighting")
        custom_prompt = data.get("custom_prompt") or data.get("prompt")

        # If a file is uploaded directly in this request, validate and save it
        if uploaded_file and uploaded_file.filename:
            orig_fname = secure_filename(uploaded_file.filename)
            if not is_allowed_extension(orig_fname):
                return jsonify({
                    "success": False,
                    "error": f"Invalid attached sketch format. Allowed: {sorted(ALLOWED_EXTENSIONS)}.",
                    "status_code": 400,
                }), 400

            is_valid, err, _ = validate_image_stream(uploaded_file.stream)
            if not is_valid:
                return jsonify({
                    "success": False,
                    "error": f"Invalid attached sketch: {err}",
                    "status_code": 400,
                }), 400

            unique_id = str(uuid.uuid4())
            safe_fname = f"{unique_id}_{orig_fname}"
            saved_path = os.path.join(app.config["UPLOAD_FOLDER"], safe_fname)
            uploaded_file.save(saved_path)
            image_id = safe_fname

        # 1. Parameter Validation
        try:
            validated_payload = validate_generation_payload(
                style=style,
                materials=materials,
                lighting=lighting,
                custom_prompt=custom_prompt,
                image_id=image_id,
                has_uploaded_file=bool(uploaded_file),
            )
        except GenerationValidationError as val_err:
            return jsonify({
                "success": False,
                "error": str(val_err),
                "status_code": 400,
            }), 400

        # 2. Verify referenced sketch exists on disk with anti-directory-traversal
        if not image_id or os.path.basename(image_id) != image_id:
            return jsonify({
                "success": False,
                "error": "Invalid image_id specification.",
                "status_code": 400,
            }), 400

        target_path = os.path.join(app.config["UPLOAD_FOLDER"], image_id)
        if not os.path.commonpath([app.config["UPLOAD_FOLDER"], os.path.abspath(target_path)]) == os.path.abspath(app.config["UPLOAD_FOLDER"]):
            return jsonify({
                "success": False,
                "error": "Access denied: invalid image path.",
                "status_code": 403,
            }), 403

        if not os.path.exists(target_path):
            return jsonify({
                "success": False,
                "error": f"Referenced sketch image '{image_id}' not found. Please upload the sketch first.",
                "status_code": 404,
            }), 404

        # 3. Call Cloudflare Workers AI image generation pipeline
        try:
            gen_result = generate_cabin_image(
                sketch_path=target_path,
                cabin_style=validated_payload["style"],
                materials=validated_payload["materials"],
                lighting=validated_payload["lighting"],
                custom_prompt=validated_payload["custom_prompt"],
                output_dir=app.config["GENERATED_FOLDER"],
            )
        except GenerationConfigurationError as config_err:
            return jsonify({
                "success": False,
                "error": str(config_err),
                "status_code": 503,
            }), 503
        except ImageGenerationError as gen_err:
            diagnostics = gen_err.diagnostics
            logger.warning(
                "Cloudflare image generation failed: status=%s type=%s code=%s request_id=%s message=%s",
                gen_err.status_code,
                diagnostics.get("type"),
                diagnostics.get("code"),
                diagnostics.get("request_id"),
                diagnostics.get("message"),
            )
            response = {
                "success": False,
                "error": str(gen_err),
                "error_type": diagnostics.get("type"),
                "error_code": diagnostics.get("code"),
                "request_id": diagnostics.get("request_id"),
                "status_code": gen_err.status_code,
            }
            return jsonify(response), gen_err.status_code
        except Exception as unk_err:
            logger.error("Unexpected image generation error: type=%s", type(unk_err).__name__)
            return jsonify({
                "success": False,
                "error": "An unexpected error occurred during Cloudflare Workers AI image generation. Please retry.",
                "status_code": 500,
            }), 500

        # 4. Successful Generation Response
        return jsonify({
            "success": True,
            "message": "Cabin visualization generated successfully.",
            "generated_filename": gen_result["generated_filename"],
            "image_url": gen_result["image_url"],
            "metadata": {
                "style": validated_payload["style"],
                "materials": validated_payload["materials"],
                "lighting": validated_payload["lighting"],
                "custom_prompt": validated_payload["custom_prompt"],
                "model": gen_result["model"],
                "size": gen_result["size"],
                "file_size_bytes": gen_result["file_size_bytes"],
            },
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }), 200

    @app.route("/api/uploads/<path:filename>", methods=["GET"])
    def get_uploaded_image(filename: str):
        """
        Safely serves an uploaded sketch file with anti-traversal security checks.
        """
        safe_name = os.path.basename(filename)
        if safe_name != filename:
            return jsonify({"success": False, "error": "Invalid file path."}), 400

        file_path = os.path.join(app.config["UPLOAD_FOLDER"], safe_name)
        if not os.path.commonpath([app.config["UPLOAD_FOLDER"], os.path.abspath(file_path)]) == os.path.abspath(app.config["UPLOAD_FOLDER"]):
            return jsonify({"success": False, "error": "Access denied."}), 403

        if not os.path.exists(file_path):
            return jsonify({"success": False, "error": "File not found."}), 404

        return send_from_directory(app.config["UPLOAD_FOLDER"], safe_name)

    @app.route("/api/generated/<path:filename>", methods=["GET"])
    def get_generated_image(filename: str):
        """
        Safely serves an AI-generated rendering with anti-traversal security checks.
        """
        safe_name = os.path.basename(filename)
        if safe_name != filename:
            return jsonify({"success": False, "error": "Invalid file path."}), 400

        file_path = os.path.join(app.config["GENERATED_FOLDER"], safe_name)
        if not os.path.commonpath([app.config["GENERATED_FOLDER"], os.path.abspath(file_path)]) == os.path.abspath(app.config["GENERATED_FOLDER"]):
            return jsonify({"success": False, "error": "Access denied."}), 403

        if not os.path.exists(file_path):
            return jsonify({"success": False, "error": "Generated image not found."}), 404

        return send_from_directory(app.config["GENERATED_FOLDER"], safe_name)

    return app


# Instantiate app for WSGI / Flask CLI / python app.py
app = create_app()

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5001))
    host = os.getenv("HOST", "127.0.0.1")
    debug = os.getenv("FLASK_ENV") == "development"
    print(f"Starting CabinVision AI Flask Backend on http://{host}:{port} (Debug: {debug})")
    app.run(host=host, port=port, debug=debug)
