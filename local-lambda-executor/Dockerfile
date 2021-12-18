#
# AWS docs: https://docs.aws.amazon.com/lambda/latest/dg/images-create.html#images-create-1
#
FROM node:16 AS builder

# Application directory
ARG LLE_BUILD_DIR=/home/node/lle

# Create app directory
RUN mkdir ${LLE_BUILD_DIR}
RUN chown -R node:node ${LLE_BUILD_DIR}

WORKDIR ${LLE_BUILD_DIR}

# Install app dependencies
COPY --chown=node:node ./package*.json ./

# From now everything will be executed under the `node` user
USER node

RUN npm install

# Bundle app source
COPY --chown=node:node . .

# Build application
RUN npm run build

FROM node:16-alpine

# Application directory
ARG LLE_BUILD_DIR=/home/node/lle
ARG LLE_DIR=/opt/lle

# Create app directory
RUN mkdir $LLE_DIR
RUN chown -R node:node ${LLE_DIR}

WORKDIR ${LLE_DIR}

# From now everything will be executed under the `node` user
USER node
COPY --from=builder --chown=node:node ${LLE_BUILD_DIR}/package*.json .

ARG PRODUCTION=true
RUN if [ PRODUCTION = true ]; then npm ci --only=production; else npm install ; fi

# Copy prebuilt application bundle
COPY --from=builder --chown=node:node ${LLE_BUILD_DIR}/dist ./dist

# Setup configs
RUN mkdir -p ./config
COPY ./config/default-config.template.yml ./config/config.yml

EXPOSE 3000
ENTRYPOINT [ "npm", "run" ]
CMD [ "start" ]
