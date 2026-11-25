"""CabinVision AI backend tests for uploads, processing, and Cloudflare image generation."""

import io
import json
import os
import shutil
import tempfile
import unittest
import base64
from urllib.error import HTTPError
from unittest.mock import patch, MagicMock
from PIL import Image
from werkzeug.datastructures import MultiDict

from app import create_app
from image_processor import (
    validate_image_stream,
    validate_image_file,
    load_image_rgb,
    resize_preserve_aspect,
    apply_light_denoising,
    preprocess_sketch,
)
from image_generator import (
    build_cabin_prompt,
    validate_generation_payload,
    generate_cabin_image,
    get_cloudflare_config,
    GenerationValidationError,
    GenerationConfigurationError,
    ImageGenerationError,
)


def create_dummy_image(format="PNG", size=(200, 150), color=(180, 130, 80)) -> io.BytesIO:
    """Creates an in-memory valid image buffer for testing."""
    buf = io.BytesIO()
    img = Image.new("RGB", size, color=color)
    img.save(buf, format=format)
    buf.seek(0)
    return buf


def create_grayscale_image(size=(160, 120)) -> io.BytesIO:
    """Creates an in-memory 1-channel grayscale image."""
    buf = io.BytesIO()
    img = Image.new("L", size, color=128)
    img.save(buf, format="PNG")
    buf.seek(0)
    return buf


def cloudflare_response(image_b64=None, success=True, errors=None):
    """Create a Cloudflare-shaped successful or failed HTTP response."""
    response = MagicMock()
    response.__enter__.return_value = response
    response.status = 200
    response.headers = {}
    payload = {"success": success, "result": {}, "errors": errors or []}
    if image_b64 is not None:
        payload["result"]["image"] = image_b64
    response.read.return_value = json.dumps(payload).encode("utf-8")
    return response


def cloudflare_http_error(status, message, code=10000, headers=None):
    payload = {
        "success": False,
        "errors": [{"code": code, "message": message}],
        "messages": [],
    }
    return HTTPError(
        "https://api.cloudflare.com/test",
        status,
        "Cloudflare API error",
        headers or {},
        io.BytesIO(json.dumps(payload).encode("utf-8")),
    )


class BackendApiTestCase(unittest.TestCase):
    """Test suite verifying all Stage 3 and Stage 4 endpoints and workflows."""

    def setUp(self):
        self.test_dir = tempfile.mkdtemp()
        self.upload_dir = os.path.join(self.test_dir, "uploads")
        self.generated_dir = os.path.join(self.test_dir, "generated")
        self.preprocessed_dir = os.path.join(self.generated_dir, "preprocessed")
        
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.generated_dir, exist_ok=True)
        os.makedirs(self.preprocessed_dir, exist_ok=True)

        self.app = create_app({
            "TESTING": True,
            "UPLOAD_FOLDER": self.upload_dir,
            "GENERATED_FOLDER": self.generated_dir,
            "PREPROCESSED_FOLDER": self.preprocessed_dir,
            "MAX_CONTENT_LENGTH": 10 * 1024 * 1024,
        })
        self.client = self.app.test_client()

    def tearDown(self):
        shutil.rmtree(self.test_dir, ignore_errors=True)

    # -------------------------------------------------------------
    # 1. Health Endpoint Tests
    # -------------------------------------------------------------
    def test_01_health_endpoint(self):
        """Verify GET /api/health returns 200, healthy status, and safe metadata."""
        resp = self.client.get("/api/health")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data.get("success"))
        self.assertEqual(data.get("status"), "healthy")
        self.assertEqual(data.get("backend"), "CabinVision AI Backend")
        self.assertEqual(data.get("image_model"), "@cf/black-forest-labs/flux-2-klein-4b")
        self.assertEqual(data.get("provider"), "Cloudflare Workers AI")
        self.assertIn("cloudflare_configured", data)
        self.assertEqual(data.get("api_ready"), data.get("cloudflare_configured"))
        self.assertNotIn("CLOUDFLARE_API_TOKEN", data)

    # -------------------------------------------------------------
    # 2. Valid Image Upload Tests
    # -------------------------------------------------------------
    def test_02_valid_image_upload_png(self):
        """Verify POST /api/upload accepts a valid PNG sketch image."""
        img_buf = create_dummy_image(format="PNG", size=(320, 240))
        resp = self.client.post(
            "/api/upload",
            data={"file": (img_buf, "modern_cabin_sketch.png")},
            content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("image_id", data)
        self.assertEqual(data.get("filename"), "modern_cabin_sketch.png")
        self.assertEqual(data["dimensions"]["width"], 320)
        self.assertEqual(data["dimensions"]["height"], 240)
        self.assertTrue(os.path.exists(os.path.join(self.upload_dir, data["image_id"])))

    def test_03_valid_image_upload_jpg(self):
        """Verify POST /api/upload accepts a valid JPG sketch image."""
        img_buf = create_dummy_image(format="JPEG", size=(400, 300))
        resp = self.client.post(
            "/api/upload",
            data={"file": (img_buf, "rustic_cabin.jpg")},
            content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 201)
        data = resp.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("image_id", data)
        self.assertEqual(data.get("filename"), "rustic_cabin.jpg")

    # -------------------------------------------------------------
    # 3. Invalid File Extension & Empty Upload Tests
    # -------------------------------------------------------------
    def test_04_invalid_file_extension(self):
        """Verify POST /api/upload rejects disallowed extensions (e.g. .pdf)."""
        fake_pdf = io.BytesIO(b"%PDF-1.4 simulated pdf document")
        resp = self.client.post(
            "/api/upload",
            data={"file": (fake_pdf, "cabin_spec.pdf")},
            content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertFalse(data.get("success"))
        self.assertIn("Unsupported file extension", data.get("error"))

    def test_05_empty_upload_no_file(self):
        """Verify POST /api/upload returns 400 when no file field is sent."""
        resp = self.client.post("/api/upload", data={}, content_type="multipart/form-data")
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertFalse(data.get("success"))
        self.assertIn("No file uploaded", data.get("error"))

    def test_06_empty_upload_empty_filename(self):
        """Verify POST /api/upload returns 400 when an empty filename is provided."""
        empty_buf = io.BytesIO(b"")
        resp = self.client.post(
            "/api/upload",
            data={"file": (empty_buf, "")},
            content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertFalse(data.get("success"))

    # -------------------------------------------------------------
    # 4. Oversized & Corrupted Image Tests
    # -------------------------------------------------------------
    def test_07_oversized_image_handling(self):
        """Verify server rejects uploads exceeding MAX_CONTENT_LENGTH with 413."""
        tiny_app = create_app({
            "TESTING": True,
            "UPLOAD_FOLDER": self.upload_dir,
            "GENERATED_FOLDER": self.generated_dir,
            "PREPROCESSED_FOLDER": self.preprocessed_dir,
            "MAX_CONTENT_LENGTH": 1024,  # 1 KB limit
        })
        client = tiny_app.test_client()

        large_payload = io.BytesIO(b"X" * 2048)
        resp = client.post(
            "/api/upload",
            data={"file": (large_payload, "large.png")},
            content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 413)
        data = resp.get_json()
        self.assertFalse(data.get("success"))
        self.assertIn("exceeds maximum allowed limit", data.get("error"))

    def test_08_corrupted_image_handling(self):
        """Verify POST /api/upload rejects corrupted or non-image files with valid extensions."""
        corrupted_buf = io.BytesIO(b"THIS_IS_DEFINITELY_NOT_AN_IMAGE_HEADER_CONTENT")
        resp = self.client.post(
            "/api/upload",
            data={"file": (corrupted_buf, "corrupted_sketch.png")},
            content_type="multipart/form-data"
        )
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertFalse(data.get("success"))
        self.assertTrue("Invalid" in data.get("error") or "not a valid" in data.get("error"))

    def test_image_pixel_limit(self):
        """Reject images whose decoded pixel count exceeds the configured limit."""
        image = MagicMock()
        image.__enter__.return_value = image
        image.size = (5000, 4000)
        image.format = "PNG"
        image.mode = "RGB"

        with patch("image_processor.Image.open", return_value=image):
            is_valid, error, meta = validate_image_stream(io.BytesIO(b"image"))

        self.assertFalse(is_valid)
        self.assertIn("total pixels", error)
        self.assertIsNone(meta)

    # -------------------------------------------------------------
    # 5. Missing Customization Fields Tests
    # -------------------------------------------------------------
    def test_09_generation_missing_style(self):
        """Verify POST /api/generate returns 400 if style is missing."""
        resp = self.client.post(
            "/api/generate",
            json={
                "image_id": "test_id.png",
                "materials": ["Wood"],
                "lighting": "Daylight",
            }
        )
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertIn("style", data.get("error").lower())

    def test_10_generation_missing_materials(self):
        """Verify POST /api/generate returns 400 if materials are missing."""
        resp = self.client.post(
            "/api/generate",
            json={
                "image_id": "test_id.png",
                "style": "Modern",
                "lighting": "Daylight",
            }
        )
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertIn("materials", data.get("error").lower())

    def test_11_generation_missing_lighting(self):
        """Verify POST /api/generate returns 400 if lighting is missing."""
        resp = self.client.post(
            "/api/generate",
            json={
                "image_id": "test_id.png",
                "style": "Modern",
                "materials": ["Wood"],
            }
        )
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertIn("lighting", data.get("error").lower())

    def test_12_generation_missing_sketch_reference(self):
        """Verify POST /api/generate returns 400 if no image_id or file is supplied."""
        resp = self.client.post(
            "/api/generate",
            json={
                "style": "Modern",
                "materials": ["Wood"],
                "lighting": "Daylight",
            }
        )
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertIn("sketch", data.get("error").lower())

    def test_13_generation_nonexistent_image_id(self):
        """Verify POST /api/generate returns 404 if referenced image_id is not on disk."""
        resp = self.client.post(
            "/api/generate",
            json={
                "image_id": "non_existent_sketch_uuid.png",
                "style": "Modern",
                "materials": ["Wood", "Glass"],
                "lighting": "Sunset",
            }
        )
        self.assertEqual(resp.status_code, 404)
        data = resp.get_json()
        self.assertIn("not found", data.get("error").lower())

    # -------------------------------------------------------------
    # 6. Prompt Engineering & Structure Tests
    # -------------------------------------------------------------
    def test_14_prompt_builder_structure(self):
        """Verify build_cabin_prompt integrates styles, materials, lighting, and directives."""
        prompt = build_cabin_prompt(
            cabin_style="Scandinavian",
            materials=["Wood", "Glass"],
            lighting="Sunset",
            custom_prompt="Alpine lake reflection with snow-capped peaks"
        )
        
        self.assertIn("scandinavian", prompt.lower())
        self.assertIn("nordic", prompt.lower())
        self.assertIn("cedar", prompt.lower())
        self.assertIn("glass", prompt.lower())
        self.assertIn("sunset", prompt.lower())
        self.assertIn("preserve the primary architectural composition", prompt.lower())
        self.assertIn("alpine lake reflection with snow-capped peaks", prompt.lower())

    # -------------------------------------------------------------
    # 7. Missing & Placeholder Cloudflare Credentials
    # -------------------------------------------------------------
    @patch.dict(os.environ, {"CLOUDFLARE_ACCOUNT_ID": "", "CLOUDFLARE_API_TOKEN": ""}, clear=False)
    def test_15_missing_cloudflare_credentials_raise_configuration_error(self):
        """Configuration fails clearly when either Cloudflare credential is missing."""
        with self.assertRaises(GenerationConfigurationError):
            get_cloudflare_config()

    @patch.dict(
        os.environ,
        {
            "CLOUDFLARE_ACCOUNT_ID": "your_cloudflare_account_id",
            "CLOUDFLARE_API_TOKEN": "your_cloudflare_api_token",
        },
        clear=False,
    )
    def test_16_placeholder_cloudflare_credentials_raise_configuration_error(self):
        """Placeholder credentials from .env.example are recognized and rejected."""
        with self.assertRaises(GenerationConfigurationError):
            get_cloudflare_config()

    @patch.dict(
        os.environ,
        {"CLOUDFLARE_ACCOUNT_ID": "test-account", "CLOUDFLARE_API_TOKEN": "test-token"},
        clear=False,
    )
    def test_cloudflare_config_returns_default_model(self):
        account_id, api_token, model = get_cloudflare_config()

        self.assertEqual(account_id, "test-account")
        self.assertEqual(api_token, "test-token")
        self.assertEqual(model, "@cf/black-forest-labs/flux-2-klein-4b")

    @patch.dict(os.environ, {"CLOUDFLARE_ACCOUNT_ID": "", "CLOUDFLARE_API_TOKEN": ""}, clear=False)
    def test_17_generate_endpoint_returns_503_when_cloudflare_is_unconfigured(self):
        """POST /api/generate explains missing Cloudflare setup without exposing credentials."""
        img_buf = create_dummy_image(format="PNG", size=(300, 200))
        upload_resp = self.client.post(
            "/api/upload",
            data={"file": (img_buf, "test_sketch.png")},
            content_type="multipart/form-data"
        )
        image_id = upload_resp.get_json()["image_id"]

        resp = self.client.post(
            "/api/generate",
            json={
                "image_id": image_id,
                "style": "Modern",
                "materials": ["Wood"],
                "lighting": "Daylight",
            }
        )
        self.assertEqual(resp.status_code, 503)
        data = resp.get_json()
        self.assertFalse(data.get("success"))
        self.assertIn("CLOUDFLARE_API_TOKEN", data.get("error"))

    # -------------------------------------------------------------
    # 8. Mocked Successful Image Generation Pipeline
    # -------------------------------------------------------------
    def test_18_mocked_image_generation_success(self):
        """
        Verify the Cloudflare pipeline decodes base64, saves the PNG, and preserves the API response.
        """
        img_buf = create_dummy_image(format="PNG", size=(400, 300))
        upload_resp = self.client.post(
            "/api/upload",
            data={"file": (img_buf, "mountain_cabin.png")},
            content_type="multipart/form-data"
        )
        image_id = upload_resp.get_json()["image_id"]

        synthetic_render_buf = create_dummy_image(format="JPEG", size=(600, 400), color=(120, 80, 40))
        fake_b64 = base64.b64encode(synthetic_render_buf.getvalue()).decode("utf-8")
        fake_response = cloudflare_response(image_b64=fake_b64)

        with (
            patch(
                "image_generator.get_cloudflare_config",
                return_value=("test-account", "test-token", "@cf/black-forest-labs/flux-2-klein-4b"),
            ),
            patch("image_generator.urlopen", return_value=fake_response) as mock_urlopen,
        ):
            resp = self.client.post(
                "/api/generate",
                json={
                    "image_id": image_id,
                    "style": "Rustic",
                    "materials": ["Wood", "Stone"],
                    "lighting": "Warm",
                    "custom_prompt": "Cabin with river rock fireplace and mountain background"
                }
            )

        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertTrue(data.get("success"))
        self.assertIn("generated_filename", data)
        self.assertIn("image_url", data)
        
        gen_file = os.path.join(self.generated_dir, data["generated_filename"])
        self.assertTrue(os.path.exists(gen_file))
        self.assertGreater(os.path.getsize(gen_file), 0)
        with Image.open(gen_file) as generated_image:
            self.assertEqual(generated_image.format, "PNG")
        self.assertEqual(data["metadata"]["style"], "Rustic")
        self.assertEqual(data["metadata"]["model"], "@cf/black-forest-labs/flux-2-klein-4b")
        request = mock_urlopen.call_args.args[0]
        self.assertEqual(
            request.full_url,
            "https://api.cloudflare.com/client/v4/accounts/test-account/ai/run/@cf/black-forest-labs/flux-2-klein-4b",
        )
        self.assertEqual(request.get_header("Authorization"), "Bearer test-token")
        self.assertTrue(request.get_header("Content-type").startswith("multipart/form-data; boundary="))
        self.assertIn(b'name="width"\r\n\r\n1024\r\n', request.data)
        self.assertIn(b'name="height"\r\n\r\n1024\r\n', request.data)
        self.assertIn(b'name="strength"\r\n\r\n0.75\r\n', request.data)
        image_field = request.data.split(b'name="image_b64"\r\n\r\n', 1)[1].split(b"\r\n", 1)[0]
        self.assertTrue(base64.b64decode(image_field).startswith(b"\xff\xd8\xff"))
        self.assertEqual(mock_urlopen.call_args.kwargs["timeout"], 240)

    def test_generation_fails_if_sketch_preparation_fails(self):
        """Do not send an unprepared sketch to Cloudflare."""
        sketch_path = os.path.join(self.upload_dir, "sketch.png")
        with open(sketch_path, "wb") as sketch_file:
            sketch_file.write(create_dummy_image().getvalue())

        with (
            patch(
                "image_generator.get_cloudflare_config",
                return_value=("test-account", "test-token", "@cf/black-forest-labs/flux-2-klein-4b"),
            ),
            patch(
                "image_generator.prepare_sketch_for_image_edit",
                side_effect=OSError("could not write image"),
            ),
            patch("image_generator.urlopen") as mock_urlopen,
        ):
            with self.assertRaises(ImageGenerationError) as error:
                generate_cabin_image(
                    sketch_path=sketch_path,
                    cabin_style="Modern",
                    materials=["Wood"],
                    lighting="Daylight",
                    output_dir=self.generated_dir,
                )

        self.assertIn("prepare the sketch", str(error.exception))
        mock_urlopen.assert_not_called()

    def test_multipart_generation_preserves_multiple_materials(self):
        """Keep all repeated material fields when generating from a direct file upload."""
        image_buffer = create_dummy_image()
        with patch(
            "app.generate_cabin_image",
            return_value={
                "generated_filename": "cabin_render_test.png",
                "image_url": "/api/generated/cabin_render_test.png",
                "model": "@cf/black-forest-labs/flux-2-klein-4b",
                "size": "1024x1024",
                "file_size_bytes": 100,
            },
        ):
            response = self.client.post(
                "/api/generate",
                data=MultiDict([
                    ("file", (image_buffer, "sketch.png")),
                    ("style", "Modern"),
                    ("materials", "Wood"),
                    ("materials", "Stone"),
                    ("lighting", "Daylight"),
                ]),
                content_type="multipart/form-data",
            )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.get_json()["metadata"]["materials"], ["Wood", "Stone"])

    def test_generation_rejects_invalid_base64_response(self):
        """Reject malformed image data instead of saving a corrupt rendering."""
        sketch_path = os.path.join(self.upload_dir, "sketch.png")
        with open(sketch_path, "wb") as sketch_file:
            sketch_file.write(create_dummy_image().getvalue())

        with (
            patch(
                "image_generator.get_cloudflare_config",
                return_value=("test-account", "test-token", "@cf/black-forest-labs/flux-2-klein-4b"),
            ),
            patch("image_generator.urlopen", return_value=cloudflare_response(image_b64="not-valid-base64!")),
        ):
            with self.assertRaises(ImageGenerationError) as error:
                generate_cabin_image(
                    sketch_path=sketch_path,
                    cabin_style="Modern",
                    materials=["Wood"],
                    lighting="Daylight",
                    output_dir=self.generated_dir,
                )

        self.assertEqual(error.exception.status_code, 502)
        self.assertFalse(any(name.startswith("cabin_render_") for name in os.listdir(self.generated_dir)))

    # -------------------------------------------------------------
    # 9. Static Serving Tests (/api/generated/<filename>)
    # -------------------------------------------------------------
    def test_19_get_generated_image_endpoint(self):
        """Verify GET /api/generated/<filename> safely serves files."""
        sample_filename = "cabin_render_test_123.png"
        sample_path = os.path.join(self.generated_dir, sample_filename)
        with open(sample_path, "wb") as f:
            f.write(create_dummy_image().getvalue())

        resp = self.client.get(f"/api/generated/{sample_filename}")
        self.assertEqual(resp.status_code, 200)
        self.assertEqual(resp.mimetype, "image/png")
        resp.close()

    def test_20_get_generated_image_404_on_missing(self):
        """Verify GET /api/generated/<filename> returns 404 for nonexistent file."""
        resp = self.client.get("/api/generated/nonexistent_file_999.png")
        self.assertEqual(resp.status_code, 404)

    # -------------------------------------------------------------
    # 10. Cloudflare Error Handling (Mocked)
    # -------------------------------------------------------------
    def test_21_cloudflare_authentication_error(self):
        """Verify invalid Cloudflare credentials map to a safe HTTP 401 response."""
        img_buf = create_dummy_image(format="PNG")
        upload_resp = self.client.post(
            "/api/upload",
            data={"file": (img_buf, "sketch.png")},
            content_type="multipart/form-data"
        )
        image_id = upload_resp.get_json()["image_id"]

        with (
            patch(
                "image_generator.get_cloudflare_config",
                return_value=("test-account", "test-token", "@cf/black-forest-labs/flux-2-klein-4b"),
            ),
            patch("image_generator.urlopen", side_effect=cloudflare_http_error(401, "Invalid API token.")),
            self.assertLogs("app", level="WARNING") as captured_logs,
        ):
            resp = self.client.post(
                "/api/generate",
                json={
                    "image_id": image_id,
                    "style": "Modern",
                    "materials": ["Wood"],
                    "lighting": "Daylight",
                },
            )

        self.assertEqual(resp.status_code, 401)
        data = resp.get_json()
        self.assertFalse(data.get("success"))
        self.assertIn("Cloudflare rejected the API token", data.get("error"))
        self.assertNotIn("test-token", data.get("error"))
        self.assertNotIn("test-token", "\n".join(captured_logs.output))

    def test_22_cloudflare_rate_limit_error(self):
        """Verify Cloudflare request rate limits receive a specific response."""
        img_buf = create_dummy_image(format="PNG")
        upload_resp = self.client.post(
            "/api/upload",
            data={"file": (img_buf, "sketch.png")},
            content_type="multipart/form-data"
        )
        image_id = upload_resp.get_json()["image_id"]

        with (
            patch(
                "image_generator.get_cloudflare_config",
                return_value=("test-account", "test-token", "@cf/black-forest-labs/flux-2-klein-4b"),
            ),
            patch(
                "image_generator.urlopen",
                side_effect=cloudflare_http_error(
                    429,
                    "Rate limit exceeded.",
                    headers={"cf-ray": "ray-rate-limit"},
                ),
            ),
        ):
            resp = self.client.post(
                "/api/generate",
                json={
                    "image_id": image_id,
                    "style": "Modern",
                    "materials": ["Wood"],
                    "lighting": "Daylight"
                }
            )

        self.assertEqual(resp.status_code, 429)
        data = resp.get_json()
        self.assertIn("rate limit reached", data.get("error").lower())
        self.assertEqual(data.get("error_code"), "rate_limit_exceeded")
        self.assertEqual(data.get("request_id"), "ray-rate-limit")

    def test_cloudflare_daily_allocation_error(self):
        """Explain that the Cloudflare daily free allocation resets instead of implying billing is required."""
        img_buf = create_dummy_image(format="PNG")
        upload_resp = self.client.post(
            "/api/upload",
            data={"file": (img_buf, "sketch.png")},
            content_type="multipart/form-data"
        )
        image_id = upload_resp.get_json()["image_id"]

        with (
            patch(
                "image_generator.get_cloudflare_config",
                return_value=("test-account", "test-token", "@cf/black-forest-labs/flux-2-klein-4b"),
            ),
            patch(
                "image_generator.urlopen",
                side_effect=cloudflare_http_error(429, "Daily Neurons allocation exceeded."),
            ),
        ):
            resp = self.client.post(
                "/api/generate",
                json={
                    "image_id": image_id,
                    "style": "Modern",
                    "materials": ["Wood"],
                    "lighting": "Daylight"
                }
            )

        self.assertEqual(resp.status_code, 429)
        data = resp.get_json()
        self.assertIn("daily allocation is exhausted", data.get("error").lower())
        self.assertIn("00:00 utc", data.get("error").lower())
        self.assertEqual(data.get("error_code"), "daily_allocation_exceeded")

    def test_cloudflare_model_unavailable_error(self):
        """Verify unavailable Cloudflare models provide a clear HTTP 404 response."""
        img_buf = create_dummy_image(format="PNG")
        upload_resp = self.client.post(
            "/api/upload",
            data={"file": (img_buf, "sketch.png")},
            content_type="multipart/form-data"
        )
        image_id = upload_resp.get_json()["image_id"]

        with (
            patch(
                "image_generator.get_cloudflare_config",
                return_value=("test-account", "test-token", "@cf/black-forest-labs/flux-2-klein-4b"),
            ),
            patch(
                "image_generator.urlopen",
                side_effect=cloudflare_http_error(404, "Model was not found."),
            ),
        ):
            response = self.client.post(
                "/api/generate",
                json={
                    "image_id": image_id,
                    "style": "Modern",
                    "materials": ["Wood"],
                    "lighting": "Daylight",
                }
            )

        self.assertEqual(response.status_code, 404)
        data = response.get_json()
        self.assertEqual(data.get("error_code"), "model_unavailable")
        self.assertIn("model or account was not found", data.get("error"))

    def test_23_cloudflare_timeout_error(self):
        """Verify Cloudflare timeouts map to HTTP 504."""
        img_buf = create_dummy_image(format="PNG")
        upload_resp = self.client.post(
            "/api/upload",
            data={"file": (img_buf, "sketch.png")},
            content_type="multipart/form-data"
        )
        image_id = upload_resp.get_json()["image_id"]

        with (
            patch(
                "image_generator.get_cloudflare_config",
                return_value=("test-account", "test-token", "@cf/black-forest-labs/flux-2-klein-4b"),
            ),
            patch("image_generator.urlopen", side_effect=TimeoutError("request timed out")),
        ):
            resp = self.client.post(
                "/api/generate",
                json={
                    "image_id": image_id,
                    "style": "Modern",
                    "materials": ["Wood"],
                    "lighting": "Daylight"
                }
            )

        self.assertEqual(resp.status_code, 504)
        data = resp.get_json()
        self.assertEqual(data.get("error_code"), "request_timeout")

    def test_24_empty_cloudflare_response_handling(self):
        """Verify a response without image data triggers a safe 502 error."""
        img_buf = create_dummy_image(format="PNG")
        upload_resp = self.client.post(
            "/api/upload",
            data={"file": (img_buf, "sketch.png")},
            content_type="multipart/form-data"
        )
        image_id = upload_resp.get_json()["image_id"]

        with (
            patch(
                "image_generator.get_cloudflare_config",
                return_value=("test-account", "test-token", "@cf/black-forest-labs/flux-2-klein-4b"),
            ),
            patch("image_generator.urlopen", return_value=cloudflare_response()),
        ):
            resp = self.client.post(
                "/api/generate",
                json={
                    "image_id": image_id,
                    "style": "Modern",
                    "materials": ["Wood"],
                    "lighting": "Daylight"
                }
            )

        self.assertEqual(resp.status_code, 502)
        data = resp.get_json()
        self.assertIn("no generated image", data.get("error"))

    # -------------------------------------------------------------
    # 11. Security: Anti-Directory Traversal Tests
    # -------------------------------------------------------------
    def test_25_anti_directory_traversal_endpoints(self):
        """Verify directory traversal is blocked on upload, generated, and generate endpoints."""
        resp1 = self.client.get("/api/uploads/../../etc/passwd")
        self.assertIn(resp1.status_code, [400, 403, 404])

        resp2 = self.client.get("/api/generated/../../etc/passwd")
        self.assertIn(resp2.status_code, [400, 403, 404])

        resp3 = self.client.post(
            "/api/generate",
            json={
                "image_id": "../../../etc/passwd",
                "style": "Modern",
                "materials": ["Wood"],
                "lighting": "Daylight",
            }
        )
        self.assertIn(resp3.status_code, [400, 403, 404])


    def test_26_prepare_sketch_for_image_edit(self):
        """Verify image-edit preparation creates a valid square 1024x1024 PNG."""
        from image_processor import prepare_sketch_for_image_edit
        non_square = create_dummy_image(format="PNG", size=(600, 300))
        input_path = os.path.join(self.test_dir, "non_square.png")
        output_path = os.path.join(self.test_dir, "square_1024.png")
        with open(input_path, "wb") as f:
            f.write(non_square.getvalue())

        result_path = prepare_sketch_for_image_edit(input_path, output_path, target_dim=1024)
        self.assertTrue(os.path.exists(result_path))

        with Image.open(result_path) as img:
            self.assertEqual(img.size, (1024, 1024))
            self.assertEqual(img.format, "PNG")


if __name__ == "__main__":
    unittest.main()
