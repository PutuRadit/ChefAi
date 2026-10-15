"""Validasi dan pembersihan foto yang diunggah (tanpa dependensi ke FastAPI)."""
import io
from dataclasses import dataclass

from PIL import Image, ImageOps, UnidentifiedImageError

MAX_PIXELS = 25_000_000  # batas aman terhadap decompression bomb (~25 MP)


class InvalidImageError(Exception):
    """File rusak atau bukan gambar."""


class UnsupportedImageError(InvalidImageError):
    """Gambar valid tetapi bukan JPEG/PNG."""


@dataclass
class ProcessedImage:
    content: bytes
    content_type: str
    extension: str
    width: int
    height: int


def sanitize_image(data: bytes) -> ProcessedImage:
    """Verifikasi isi file benar-benar JPEG/PNG, luruskan orientasi EXIF,
    lalu simpan ulang tanpa metadata (menghapus lokasi GPS dsb.)."""
    try:
        probe = Image.open(io.BytesIO(data))
        fmt = probe.format
        if fmt not in ("JPEG", "PNG"):
            raise UnsupportedImageError("Format gambar harus JPEG atau PNG")
        if probe.width * probe.height > MAX_PIXELS:
            raise InvalidImageError("Resolusi gambar terlalu besar")
        probe.verify()  # setelah verify() objek tidak bisa dipakai lagi

        img = Image.open(io.BytesIO(data))
        img = ImageOps.exif_transpose(img)

        out = io.BytesIO()
        if fmt == "JPEG":
            img.convert("RGB").save(out, format="JPEG", quality=95)
            content_type, ext = "image/jpeg", ".jpg"
        else:
            img.save(out, format="PNG")
            content_type, ext = "image/png", ".png"
        width, height = img.size
    except InvalidImageError:
        raise
    except (UnidentifiedImageError, Image.DecompressionBombError, OSError, SyntaxError, ValueError) as exc:
        raise InvalidImageError("File bukan gambar yang valid") from exc

    return ProcessedImage(out.getvalue(), content_type, ext, width, height)
