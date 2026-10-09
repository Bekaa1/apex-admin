# Node 22.23.3 Alpine, pinned to the image verified on the deployment host.
FROM node:22-alpine@sha256:0a7108bf6c7bf5de370ffb1a3ed6be93d405b43ff159f681a8d18c0e2bc2e402
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --no-audit --no-fund
COPY server/chat ./server/chat
COPY server/stats ./server/stats
COPY src/lib/dates.ts ./src/lib/dates.ts
COPY src/cabinet/stats/reportSelection.ts ./src/cabinet/stats/reportSelection.ts
COPY src/assets/fonts/Onest-400Regular.ttf src/assets/fonts/Onest-700Bold.ttf src/assets/fonts/OFL-Onest.txt ./src/assets/fonts/
COPY src/lib/chat.database.types.ts ./src/lib/chat.database.types.ts
COPY src/lib/database.types.ts ./src/lib/database.types.ts
ENV NODE_ENV=production
USER node
EXPOSE 8787
CMD ["node", "--experimental-strip-types", "server/chat/server.ts"]
