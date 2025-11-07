# ---------- Build stage ----------
FROM node:20 AS build
WORKDIR /app

# If you don't have a lock file, use npm install (not npm ci)
COPY package.json ./
RUN npm install

# Now copy the rest and build
COPY . .
RUN npm run build

# ---------- Runtime stage ----------
FROM node:20
WORKDIR /app

# We only need node_modules (for vite) + dist to run `vite preview`
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package.json ./package.json
COPY --from=build /app/dist ./dist

# Vite preview defaults to 4173; expose that port (or change with --port)
ENV HOST=0.0.0.0
ENV PORT=5173
EXPOSE 5173

# Use vite from devDependencies to serve the built /dist
CMD ["npx", "vite", "preview", "--host", "0.0.0.0", "--port", "5173", "--strictPort"]
