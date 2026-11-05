# syntax=docker/dockerfile:1
FROM node:22-bookworm-slim@sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d AS build

WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --include=dev && npm cache clean --force
COPY . .
RUN npm run build

FROM node:22-bookworm-slim@sha256:5ec23b7c622b00547753bc6ffd78085dd868a68aeb41c8e0a1418f033e13d96d AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev && npm cache clean --force
COPY --from=build /app/api ./api
COPY --from=build /app/server ./server
EXPOSE 4000
CMD ["node", "server/local-server.js"]
