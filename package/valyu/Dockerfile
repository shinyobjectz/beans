FROM node:22-alpine AS builder

WORKDIR /app

COPY package.json /app/package.json
COPY package-lock.json /app/package-lock.json
COPY src/ /app/src
COPY tsconfig.json /app/tsconfig.json

RUN --mount=type=cache,target=/root/.npm npm ci

RUN npm run build

FROM node:22-alpine AS release

COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/node_modules /app/node_modules/

ENV NODE_ENV=production

WORKDIR /app

ENTRYPOINT ["node", "dist/index.js"]
