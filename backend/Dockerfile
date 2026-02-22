FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

EXPOSE 3001

# Fix ownership so the non-root user can write at runtime (dev volumes)
RUN chown -R node:node /app

# Run as non-root user (Semgrep OWASP: dockerfile.security.missing-user)
USER node

CMD ["sh", "-c", "node dist/seed.js && node dist/main.js"]
