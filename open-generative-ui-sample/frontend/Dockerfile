FROM node:22-alpine

RUN corepack enable && corepack prepare pnpm@latest --activate

WORKDIR /app

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm build

ENV AGENT_URL=http://open-generative-ui-backend:8082/invocations

EXPOSE 3005
CMD ["pnpm", "start"]
