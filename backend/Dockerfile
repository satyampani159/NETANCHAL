# Netanchal game server. Build from the server folder:
#   docker build -t netanchal-server server
#   docker run -p 3000:3000 -e ALLOWED_ORIGINS=https://your-site.vercel.app netanchal-server
FROM node:22-alpine
WORKDIR /app

COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server.js sim.bundle.js ./

ENV NODE_ENV=production
ENV PORT=3000
ENV TRUST_PROXY=1
EXPOSE 3000
USER node
CMD ["node", "server.js"]
