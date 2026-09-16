from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .db import apply_schema
from .routers import activities, evidence, indicators, locations, nacebel, nbb, proposals, record_contacts, records, staatsblad, streets



@asynccontextmanager
async def lifespan(app: FastAPI):
    apply_schema()
    yield


app = FastAPI(title="Vind de echte ondernemingen", version="0.1.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/api/health")
def health():
    return {"status": "ok"}


app.include_router(records.router)
app.include_router(locations.router)
app.include_router(record_contacts.router)
app.include_router(activities.router)
app.include_router(streets.router)
app.include_router(evidence.router)
app.include_router(proposals.router)
app.include_router(nbb.router)
app.include_router(indicators.router)
app.include_router(nacebel.router)
app.include_router(staatsblad.router)
