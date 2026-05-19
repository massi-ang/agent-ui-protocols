# Build frontend
FROM node:22-alpine AS frontend-build
WORKDIR /app
COPY frontend/package.json ./
RUN npm install --legacy-peer-deps
COPY frontend/ .
ENV NEXT_PUBLIC_AGENT_URL=""
RUN npm run build

# Runtime
FROM python:3.12-slim
WORKDIR /app

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY backend/ .

RUN python tools/build_catalog/assemble_catalog.py custom_catalog.json --output-name assembled.json --out-dir . --catalog-id urn:a2ui:catalog:custom

# Copy static export
COPY --from=frontend-build /app/out ./static

EXPOSE 3002
CMD ["python", "app.py"]
