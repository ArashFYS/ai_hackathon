"""Read-only contact export for the explicit set of displayed records."""
import sqlite3
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field

from ..contact_selection import known_contacts
from ..db import get_db

router = APIRouter(prefix="/api/records", tags=["records"])


class ContactSelection(BaseModel):
    numbers: list[Annotated[str, Field(pattern=r"^\d{10}$")]] = Field(min_length=1, max_length=2000)


@router.post("/contacts")
def selected_contacts(selection: ContactSelection, conn: sqlite3.Connection = Depends(get_db)):
    numbers = list(dict.fromkeys(selection.numbers))
    rows = []
    for start in range(0, len(numbers), 500):
        batch = numbers[start:start + 500]
        placeholders = ",".join("?" for _ in batch)
        rows.extend(dict(r) for r in conn.execute(f"SELECT * FROM records WHERE nr IN ({placeholders})", batch))
    return {"contacts": known_contacts(conn, rows)}
