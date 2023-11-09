## Base ##
FROM node:20.9.0-alpine as base

RUN apk update --no-cache

## Builder ##
FROM base as builder

ENV NODE_ENV=production

WORKDIR /temp

COPY .yarn .yarn/
COPY .yarnrc.yml tsconfig.base.json yarn.lock package.json tsup.config.ts ./
COPY src/ src/
COPY prisma/ prisma/

RUN yarn install --immutable && \
	yarn build && \
	yarn workspaces focus --production

## App ##
FROM base as app

WORKDIR /app

RUN yarn global add prisma && \
	addgroup --system --gid 1001 amaneko && \
	adduser --system --uid 1001 amaneko

USER amaneko

COPY --from=builder --chown=amaneko:amaneko /temp/node_modules node_modules/
COPY --from=builder --chown=amaneko:amaneko /temp/prisma/migrations prisma/migrations/
COPY --from=builder --chown=amaneko:amaneko /temp/prisma/schema.prisma prisma/schema.prisma
COPY --from=builder --chown=amaneko:amaneko /temp/dist dist/
COPY --from=builder --chown=amaneko:amaneko /temp/package.json ./

CMD prisma migrate deploy && yarn run start
