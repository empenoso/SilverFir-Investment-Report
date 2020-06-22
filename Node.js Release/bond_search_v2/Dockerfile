FROM node:14.4.0-stretch-slim
RUN  mkdir app && \
     chown node:node /app
USER node
WORKDIR app
ADD ./ /app/
RUN npm install node-fetch
CMD ["npm","start"]

