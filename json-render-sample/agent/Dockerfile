FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install --legacy-peer-deps
COPY . .
EXPOSE 8081
ENV PORT=8081
CMD ["npx", "tsx", "src/agent.ts"]
