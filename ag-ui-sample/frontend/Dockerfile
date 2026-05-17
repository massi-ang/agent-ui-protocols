FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .
RUN npm run build

ENV AGENT_URL=http://ag-ui-backend:8080/invocations

EXPOSE 3001
CMD ["npm", "start"]
