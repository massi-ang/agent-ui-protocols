FROM node:22-slim

WORKDIR /app

COPY package.json ./
RUN npm install

COPY tsconfig.json vite.config.ts server.ts ./
COPY src/ ./src/

RUN npm run build

EXPOSE 3003

CMD ["node", "dist/server.js"]
