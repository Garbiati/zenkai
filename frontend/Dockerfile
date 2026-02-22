FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

RUN npm run build

EXPOSE 3000

# Fix ownership so the non-root user can write at runtime (dev volumes)
RUN chown -R node:node /app

# Run as non-root user (Semgrep OWASP: dockerfile.security.missing-user)
USER node

CMD ["npx", "next", "start", "--hostname", "0.0.0.0"]
