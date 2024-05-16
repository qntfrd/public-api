ARG         NODE_VERSION=20.5.0-alpine

## Builder

FROM        node:$NODE_VERSION as builder


WORKDIR     /app
ADD         . .

RUN         yarn install --ignore-optional --frozen-lockfile
RUN         yarn build


## Release

FROM        node:$NODE_VERSION as release

WORKDIR     /app

COPY        --from=builder /app/build /app/build
COPY        package.json yarn.lock ./

RUN         yarn install --prod --ignore-optional --frozen-lockfile
RUN         apk add --no-cache tini

ENTRYPOINT  ["/sbin/tini", "--"]
CMD         ["yarn", "start"]
