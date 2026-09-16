.PHONY: dev backend frontend import
backend:
	cd backend && uv run uvicorn app.main:app --reload --port 8010
frontend:
	cd frontend && pnpm dev
dev:
	@$(MAKE) -j2 backend frontend
import:
	cd backend && uv run python scripts/import_data.py ../data/raw/schoten-kbo-1000-2026-09-07.geojson
