# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim AS build

WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --include=dev && npm cache clean --force
COPY . .
RUN npm run build

FROM node:22-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/api ./api
COPY --from=build /app/server ./server
EXPOSE 4000
CMD ["node", "server/local-server.js"]
