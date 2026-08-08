FROM node:20-alpine AS build
WORKDIR /app
# Vite reads VITE_* vars at build time, so it must be passed as a build arg
# (setting it as a plain runtime "environment:" in docker-compose has no
# effect on an already-built static bundle).
ARG VITE_API_URL=http://localhost:5000/api
ENV VITE_API_URL=$VITE_API_URL
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:20-alpine
WORKDIR /app
RUN npm install -g serve
COPY --from=build /app/dist ./dist
EXPOSE 4173
CMD ["serve", "-s", "dist", "-l", "4173"]
