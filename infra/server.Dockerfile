FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
COPY packages/contracts ./packages/contracts
RUN npm pkg delete scripts.prepare && npm ci --no-audit --no-fund

FROM dependencies AS development

COPY . .

FROM dependencies AS build

COPY . .
RUN npm run build:api && npm run build:worker
RUN npm prune --omit=dev

FROM node:22-bookworm-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/packages/contracts ./packages/contracts

RUN mkdir -p /app/.data/imports && chown -R node:node /app/.data && chmod 700 /app/.data /app/.data/imports
USER node

