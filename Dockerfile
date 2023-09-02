## Builder ##
FROM node:20-alpine as builder

ENV NODE_ENV=production

RUN apk update

WORKDIR /temp

COPY .yarn .yarn/
COPY .yarnrc.yml tsconfig.base.json yarn.lock package.json tsup.config.ts ./
COPY src/ src/
COPY prisma/ prisma/

RUN yarn install --immutable && \
	yarn build

## App ##
FROM node:20-alpine as app

WORKDIR /app

## Canvas dependencies
RUN apk update && \
	yarn global add prisma && \
	addgroup --system --gid 1001 amaneko && \
	adduser --system --uid 1001 amaneko

USER amaneko

COPY --from=builder --chown=amaneko:amaneko /temp/node_modules node_modules/
COPY --from=builder --chown=amaneko:amaneko /temp/prisma/migrations prisma/migrations/
COPY --from=builder --chown=amaneko:amaneko /temp/prisma/schema.prisma prisma/schema.prisma
COPY --from=builder --chown=amaneko:amaneko /temp/dist dist/
COPY --from=builder --chown=amaneko:amaneko /temp/package.json ./

CMD yarn prisma migrate deploy && yarn run start
