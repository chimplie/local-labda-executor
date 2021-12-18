FROM public.ecr.aws/lambda/nodejs:14 as builder

COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Build application
RUN npm run build

FROM public.ecr.aws/lambda/nodejs:14

COPY package*.json ./

RUN npm ci --only=production

COPY --from=builder ${LAMBDA_TASK_ROOT}/dist ${LAMBDA_TASK_ROOT}

CMD ["app.lambdaHandler"]
