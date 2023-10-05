FROM node:18.18.0

WORKDIR /app

COPY ../package*.json ../package-lock.json ./
RUN npm install

COPY ./app ./app

EXPOSE 3000

CMD ["npm", "run", "start"]
