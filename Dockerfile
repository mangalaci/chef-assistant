# syntax=docker/dockerfile:1
# Web app image: Next.js production build, migrations on start.
# The reranker model is downloaded at build time, so the running container
# does not need access to Hugging Face.

FROM node:22-bookworm-slim AS base
ENV PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH \
    NEXT_TELEMETRY_DISABLED=1 \
    # onnxruntime-node would otherwise also fetch its GPU (CUDA) libraries.
    ONNXRUNTIME_NODE_INSTALL_CUDA=skip
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

FROM deps AS build
COPY . .
# No real secrets exist at build time; they come from the environment at runtime.
RUN SKIP_ENV_VALIDATION=1 pnpm build
RUN pnpm exec tsx scripts/download-reranker.ts

FROM base AS runner
ENV NODE_ENV=production \
    PORT=3000
COPY --from=build /app ./
EXPOSE 3000
CMD ["sh", "-c", "pnpm db:migrate && pnpm start"]
