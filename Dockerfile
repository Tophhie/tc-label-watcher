FROM node:24-slim AS builder
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
# RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --frozen-lockfile
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm exec tsc

FROM node:24-alpine3.22 AS runtime
ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
RUN corepack enable
WORKDIR /app

COPY --from=builder /app/dist /app/dist
COPY ./drizzle /app/drizzle
# A very bad hack. need to see how to get a toml file to the volume of railway without this
# COPY settings.toml /app/settings.toml
COPY --from=builder /app/package.json /app/pnpm-lock.yaml /app/pnpm-workspace.yaml ./
# RUN --mount=type=cache,id=pnpm,target=/pnpm/store pnpm install --prod --frozen-lockfile
RUN pnpm install --prod --frozen-lockfile

# ENV DATABASE_URL="file:/app/data/label-watcher.db"
ENV MIGRATIONS_FOLDER="drizzle"

CMD ["node", "dist/index.js"]
