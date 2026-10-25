FROM node:22-bookworm-slim AS dependencies

WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci

FROM dependencies AS development

COPY . .
CMD ["npm", "run", "dev:web", "--", "--host", "0.0.0.0"]

FROM dependencies AS build

COPY . .
ARG VITE_API_BASE_URL=/api
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}
RUN npm run build:web

FROM caddy:2.10-alpine AS production

COPY --from=build /app/apps/web/dist /srv
