# Multi-stage Dockerfile for Kuchoo Xcorp Messenger
# Stage 1: Build React Client
FROM node:20-alpine AS client-builder
WORKDIR /app/client

COPY client/package*.json ./
RUN npm install

COPY client/ ./
ENV CI=false
ENV REACT_APP_BACKEND_URL=""
RUN npm run build

# Stage 2: Runtime Production Image
FROM node:20-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=5000

COPY package*.json ./
RUN npm install --omit=dev

COPY models/ ./models/
COPY server.js ./
COPY admin.js ./
COPY --from=client-builder /app/client/build ./client/build
RUN mkdir -p uploads

EXPOSE 5000

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:5000/api/health || exit 1

CMD ["node", "server.js"]
