"""NACEBEL 2025 code list lookups (official FOD Economie list bundled in app/data)."""
from fastapi import APIRouter, Query

from .. import nacebel

router = APIRouter(prefix="/api/nacebel", tags=["nacebel"])


@router.get("")
def search_nacebel(q: str = Query("", max_length=100), limit: int = Query(20, ge=1, le=100)):
    """[{ code, level, title }] whose code or Dutch title contains q."""
    return nacebel.search(q, limit)


@router.get("/{code}")
def describe_nacebel(code: str):
    """{ code, title, division, division_title, section, section_title } or null."""
    return nacebel.describe(code)
