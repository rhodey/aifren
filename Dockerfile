FROM node:25-alpine3.22

RUN apk add --no-cache mimic1

WORKDIR /app
COPY package.json .
COPY package-lock.json .
RUN npm install

COPY src src
RUN mv src/* .
RUN chmod +x app.sh

ENTRYPOINT ["/app/app.sh"]
