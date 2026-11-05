# syntax=docker/dockerfile:1

FROM node:24-alpine AS dependencies
WORKDIR /app
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci

FROM dependencies AS build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./
COPY src ./src
RUN npx prisma generate && npm run build

FROM node:24-alpine AS runtime
ENV NODE_ENV=production
WORKDIR /app
RUN addgroup -S lexilearn && adduser -S lexilearn -G lexilearn
COPY package.json package-lock.json prisma.config.ts ./
COPY prisma ./prisma
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
# Tesseract.js downloads language data at runtime; give the unprivileged user
# a writable, persistent-at-container-scope cache directory.
ENV TESSERACT_CACHE_PATH=/app/.tesseract-cache
RUN mkdir -p /app/.tesseract-cache && chown -R lexilearn:lexilearn /app/.tesseract-cache
USER lexilearn
EXPOSE 3000
CMD ["node", "dist/main.js"]
