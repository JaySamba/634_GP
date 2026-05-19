"""
Voyage AI embedder.

Sends chunks to Voyage in batches and returns embeddings aligned to the
input order. Retries on transient errors.

Voyage's recommended max batch size for voyage-3 is 128 inputs per call.
"""

from typing import Sequence

import voyageai
from tenacity import retry, stop_after_attempt, wait_exponential

import sys
import os
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))
from config import settings


_client: voyageai.Client | None = None


def _get_client() -> voyageai.Client:
    global _client
    if _client is None:
        _client = voyageai.Client(api_key=settings.voyage_api_key)
    return _client


@retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, min=2, max=20))
def _embed_batch(texts: Sequence[str], input_type: str) -> list[list[float]]:
    client = _get_client()
    result = client.embed(
        list(texts),
        model=settings.voyage_model,
        input_type=input_type,
    )
    return result.embeddings


def embed_chunks(texts: Sequence[str], batch_size: int = 128) -> list[list[float]]:
    """
    Embed chunk texts for storage. Use input_type='document'.
    Returns embeddings in the same order as the input.
    """
    out: list[list[float]] = []
    for i in range(0, len(texts), batch_size):
        batch = texts[i : i + batch_size]
        out.extend(_embed_batch(batch, input_type="document"))
    return out


def embed_query(text: str) -> list[float]:
    """Embed a single search query. Use input_type='query'."""
    return _embed_batch([text], input_type="query")[0]
