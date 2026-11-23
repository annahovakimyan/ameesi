# Ameesi calculation server. Build from server/:  docker build -t ameesi-server .
# Stage 1 compiles the Python packages (pyswisseph needs a C compiler), downloads GeoNames (about 225 MB)
# and builds the place database. The final image keeps only the packages, the database, the Swiss
# Ephemeris files and the code: no compiler, no raw downloads.
FROM python:3.12-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends build-essential && rm -rf /var/lib/apt/lists/*
WORKDIR /srv
COPY requirements.txt .
RUN pip wheel --no-cache-dir --wheel-dir /wheels -r requirements.txt && pip install --no-cache-dir /wheels/*
COPY app app
COPY scripts scripts
RUN python scripts/build_places.py && rm -rf data/raw

FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1
WORKDIR /srv
COPY --from=build /wheels /wheels
RUN pip install --no-cache-dir --no-index /wheels/* && rm -rf /wheels
COPY app app
COPY ephe ephe
COPY --from=build /srv/data/places.sqlite data/places.sqlite
RUN useradd --create-home ameesi && chown -R ameesi /srv
USER ameesi
EXPOSE 8000
# --no-access-log: uvicorn's access log includes query strings (birth places). app/main.py logs
# method, path, status and duration only (CLAUDE.md rule 6).
CMD ["sh", "-c", "exec uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000} --no-access-log"]
