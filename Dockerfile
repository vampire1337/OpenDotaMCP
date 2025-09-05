FROM oven/bun:1.2-alpine

WORKDIR /app

# Copy package files and install deps
COPY package.json bun.lockb* ./
RUN bun install --production

# Copy pre-built dist (build outside container to avoid WSL issues)
COPY dist ./dist

EXPOSE 3001

CMD ["bun", "dist/improved-dota-mcp.js"]