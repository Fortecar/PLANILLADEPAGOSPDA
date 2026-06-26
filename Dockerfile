# Planilla PDA — imagen de producción
FROM node:20-alpine
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000

COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

COPY server.js index.html ./
COPY data ./data

RUN chown -R node:node /app
EXPOSE 3000
USER node
CMD ["node", "server.js"]
