FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm ci

COPY packages/shared packages/shared
COPY apps/api apps/api

RUN npm run build -w @afh/shared && npm run build -w @afh/api

FROM node:20-alpine AS production
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/
COPY packages/shared/package.json packages/shared/

RUN npm ci --omit=dev

COPY --from=build /app/apps/api/dist apps/api/dist
COPY --from=build /app/packages/shared/dist packages/shared/dist
COPY apps/api/prisma apps/api/prisma

WORKDIR /app/apps/api
RUN npx prisma generate

ENV API_PORT=3001
EXPOSE 3001

CMD ["sh", "-c", "npx prisma migrate deploy && node dist/index.js"]
