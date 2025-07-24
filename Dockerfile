FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY dist ./dist
COPY schema.graphql ./

EXPOSE 3001

CMD ["npm", "start"]