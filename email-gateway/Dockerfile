# Senvia Email Gateway — runs ALONGSIDE Chatwoot (separate container, own port).
# Does not touch Chatwoot.
FROM node:20-alpine
WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
# Override at runtime: DATABASE_URL, GATEWAY_SHARED_SECRET, PORT
EXPOSE 8730
CMD ["node", "src/server.js"]
