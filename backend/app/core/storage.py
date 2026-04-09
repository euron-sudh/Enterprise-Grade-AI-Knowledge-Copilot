"""
Storage abstraction — local disk (dev) or AWS S3 (production).

Usage:
    from app.core.storage import storage

    # Save a file
    key = await storage.put(file_bytes, "documents/uuid/filename.pdf", content_type="application/pdf")

    # Generate a URL (presigned for S3, direct for local)
    url = await storage.url(key)

    # Delete
    await storage.delete(key)

The active backend is chosen automatically:
  - S3 if AWS_S3_BUCKET is set in settings
  - Local disk otherwise
"""
import logging
import os
from pathlib import Path
from typing import Optional

from app.config import settings

logger = logging.getLogger(__name__)


class LocalStorage:
    """Stores files on the local filesystem under the uploads/ directory."""

    def __init__(self, base_dir: str = "uploads"):
        self.base = Path(base_dir)
        self.base.mkdir(parents=True, exist_ok=True)

    async def put(self, data: bytes, key: str, content_type: str = "application/octet-stream") -> str:
        path = self.base / key
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(data)
        logger.debug(f"[LocalStorage] Saved {key} ({len(data)} bytes)")
        return key

    async def get(self, key: str) -> bytes:
        path = self.base / key
        if not path.exists():
            raise FileNotFoundError(f"Object not found: {key}")
        return path.read_bytes()

    async def delete(self, key: str) -> None:
        path = self.base / key
        if path.exists():
            path.unlink()
            logger.debug(f"[LocalStorage] Deleted {key}")

    async def url(self, key: str, expires_in: int = 3600) -> str:
        """Return a path that the backend can serve directly (e.g. /uploads/{key})."""
        return f"/uploads/{key}"

    async def exists(self, key: str) -> bool:
        return (self.base / key).exists()


class S3Storage:
    """Stores files in AWS S3 with presigned URL generation."""

    def __init__(self, bucket: str, region: str = "us-east-1"):
        self.bucket = bucket
        self.region = region
        self._client = None

    def _get_client(self):
        if self._client is None:
            import boto3
            from botocore.config import Config
            self._client = boto3.client(
                "s3",
                region_name=self.region,
                aws_access_key_id=settings.AWS_ACCESS_KEY_ID or None,
                aws_secret_access_key=settings.AWS_SECRET_ACCESS_KEY or None,
                config=Config(signature_version="s3v4"),
            )
        return self._client

    async def put(self, data: bytes, key: str, content_type: str = "application/octet-stream") -> str:
        import asyncio
        client = self._get_client()
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.put_object(
                Bucket=self.bucket,
                Key=key,
                Body=data,
                ContentType=content_type,
            ),
        )
        logger.debug(f"[S3Storage] Uploaded s3://{self.bucket}/{key} ({len(data)} bytes)")
        return key

    async def get(self, key: str) -> bytes:
        import asyncio
        client = self._get_client()
        response = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.get_object(Bucket=self.bucket, Key=key),
        )
        return response["Body"].read()

    async def delete(self, key: str) -> None:
        import asyncio
        client = self._get_client()
        await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.delete_object(Bucket=self.bucket, Key=key),
        )
        logger.debug(f"[S3Storage] Deleted s3://{self.bucket}/{key}")

    async def url(self, key: str, expires_in: int = 3600) -> str:
        """Generate a presigned URL valid for `expires_in` seconds."""
        import asyncio
        client = self._get_client()
        presigned = await asyncio.get_event_loop().run_in_executor(
            None,
            lambda: client.generate_presigned_url(
                "get_object",
                Params={"Bucket": self.bucket, "Key": key},
                ExpiresIn=expires_in,
            ),
        )
        return presigned

    async def exists(self, key: str) -> bool:
        import asyncio
        from botocore.exceptions import ClientError
        client = self._get_client()
        try:
            await asyncio.get_event_loop().run_in_executor(
                None,
                lambda: client.head_object(Bucket=self.bucket, Key=key),
            )
            return True
        except ClientError:
            return False


def _build_storage():
    bucket = getattr(settings, "AWS_S3_BUCKET", None)
    if bucket:
        region = getattr(settings, "AWS_S3_REGION", "us-east-1") or "us-east-1"
        logger.info(f"Storage backend: S3 (bucket={bucket}, region={region})")
        return S3Storage(bucket=bucket, region=region)
    logger.info("Storage backend: local disk (uploads/)")
    return LocalStorage(base_dir="uploads")


# Module-level singleton — import this everywhere
storage = _build_storage()
