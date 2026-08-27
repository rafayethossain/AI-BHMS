"""
Design Sheet image processing (Week 1 - Day 3).

Pure image helpers used by the sketch upload endpoint: resize the uploaded
sketch down to a maximum dimension and generate a small thumbnail.
"""
from __future__ import annotations

from io import BytesIO

from PIL import Image

MAX_DIMENSION = 1920
THUMBNAIL_DIMENSION = 150


def process_sketch_image(data: bytes) -> tuple[bytes, bytes]:
    """Resize an uploaded image and build its thumbnail.

    Returns ``(main_bytes, thumbnail_bytes)``. Images at or below
    ``MAX_DIMENSION`` are kept untouched; only the thumbnail is derived.
    The main image is re-encoded as PNG when it had an alpha/transparent mode,
    otherwise JPEG, so oversized uploads are actually shrunk on disk.
    """
    img = Image.open(BytesIO(data))
    img.load()
    source_format = img.format or "PNG"

    original_size = img.size
    if max(img.size) > MAX_DIMENSION:
        img.thumbnail((MAX_DIMENSION, MAX_DIMENSION), Image.LANCZOS)

    thumb = img.copy()
    thumb.thumbnail((THUMBNAIL_DIMENSION, THUMBNAIL_DIMENSION), Image.LANCZOS)

    if img.mode in ("RGBA", "LA", "P"):
        main_format = "PNG"
    else:
        main_format = "JPEG"
        main_copy = img.convert("RGB")
    main = main_copy if img.mode not in ("RGBA", "LA", "P") else img

    main_bytes = BytesIO()
    if main_format == "JPEG":
        main.convert("RGB").save(main_bytes, format="JPEG", quality=90)
    else:
        main.save(main_bytes, format="PNG")

    thumb_bytes = BytesIO()
    thumb.save(thumb_bytes, format="PNG")

    return main_bytes.getvalue(), thumb_bytes.getvalue()