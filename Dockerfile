# ── Сборка фронта ──
FROM node:20-alpine AS webbuild
WORKDIR /web
COPY webapp/package.json ./
RUN npm install
COPY webapp ./
RUN npm run build

# ── Рантайм ──
FROM node:20-alpine
WORKDIR /app
COPY server/package.json ./
RUN npm install --omit=dev
COPY server ./
COPY --from=webbuild /web/dist ./public
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "index.js"]
