"""
Configuration loader for HR Agent.

Loads environment variables from .env and validates that everything
required is set. Crashes early with a useful message if not.

Usage from anywhere in the app:
    from config import settings
    print(settings.PINECONE_INDEX_NAME)
"""

import os
import sys
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the project root (the file next to this one)
PROJECT_ROOT = Path(__file__).parent.parent
load_dotenv(PROJECT_ROOT / ".env")


@dataclass
class Settings:
    # API keys
    anthropic_api_key: str
    voyage_api_key: str
    pinecone_api_key: str

    # Pinecone
    pinecone_index_name: str

    # Supabase
    supabase_url: str
    supabase_anon_key: str
    supabase_service_key: str
    supabase_db_url: str

    # App
    hr_documents_folder: str
    log_level: str

    # Microsoft Azure AD — optional, enables "Sign in with Microsoft"
    azure_client_id:     str = ""
    azure_client_secret: str = ""
    azure_tenant_id:     str = ""

    # Models (hardcoded — change here, not in .env)
    anthropic_model_smart: str = "claude-sonnet-4-6"
    anthropic_model_fast: str = "claude-haiku-4-5"
    voyage_model: str = "voyage-3"
    voyage_dimensions: int = 1024

    # Chunking defaults (we'll tune these in the ingest phase)
    chunk_size_tokens: int = 500
    chunk_overlap_tokens: int = 50


def _required(name: str) -> str:
    """Get a required env var or exit with a useful message."""
    value = os.environ.get(name, "").strip()
    if not value or value.startswith("sk-ant-...") or value.startswith("pa-...") or value.startswith("pcsk_..."):
        print(f"❌ Missing or placeholder value for {name} in .env")
        print(f"   Open .env and set a real value for {name}.")
        sys.exit(1)
    return value


def _optional(name: str, default: str) -> str:
    return os.environ.get(name, default).strip() or default


def load_settings() -> Settings:
    return Settings(
        anthropic_api_key=_required("ANTHROPIC_API_KEY"),
        voyage_api_key=_required("VOYAGE_API_KEY"),
        pinecone_api_key=_required("PINECONE_API_KEY"),
        pinecone_index_name=_optional("PINECONE_INDEX_NAME", "hr-agent"),
        supabase_url=_required("SUPABASE_URL"),
        supabase_anon_key=_required("SUPABASE_ANON_KEY"),
        supabase_service_key=_required("SUPABASE_SERVICE_KEY"),
        supabase_db_url=_required("SUPABASE_DB_URL"),
        hr_documents_folder=_optional("HR_DOCUMENTS_FOLDER", ""),
        log_level=_optional("LOG_LEVEL", "INFO"),
        azure_client_id=_optional("AZURE_CLIENT_ID", ""),
        azure_client_secret=_optional("AZURE_CLIENT_SECRET", ""),
        azure_tenant_id=_optional("AZURE_TENANT_ID", ""),
    )


# Singleton — import this from anywhere in the app
settings = load_settings()
