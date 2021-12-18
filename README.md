Local AWS Lambda Executor
=========================

Local executor for AWS Lambda functions with SQS event source mapping emulation.

> **WARNING!**
> 
> This project is under development and intended only for local emulation of AWS services.

Docker Hub [page](https://hub.docker.com/repository/docker/chimplie/local-lambda-executor).

Usage
-----

### Sample `docker-compose.yml`:

```yaml
version: "3.7"

services:
  #  
  # Local Lambda Executor  
  #  
  lle:
    image: chimplie/local-lambda-executor:local
    command: ["start"]
    environment:
      - "SQS_ENDPOINT=http://sqs:9324"
      # These are the fake credentials to bypass AWS-SDK limitations:
      - AWS_ACCESS_KEY_ID
      - AWS_SECRET_ACCESS_KEY
    ports:
      - "3000:3000"
    volumes:
      - .config/local-lambda-executor/config.yml:/opt/lle/config/config.yml

  #
  # Replace with your lambda function
  #    
  lambda:
    image: sample-lambdas/baasic:local
    build: sample-lambdas/basic
    ports:
      - "8080:8080"

  #  
  # This will emulate SQS. See: https://github.com/softwaremill/elasticmq
  #  
  sqs:
    image: softwaremill/elasticmq-native:latest
    ports:
      - "9324:9324"
      - "9325:9325"
    volumes:
      - .config/elasticmq/:/opt/persist
      - .config/elasticmq/elasticmq.conf:/opt/elasticmq.conf
```

Also check project [`docker-compose.yml`](./docker-compose.yml).

### Sample `.yml`:

```yaml
queues:
  tasks:
    name: tasks
    producers:
      - timeout: 0.25
        body: "Hello"
        params:
          DelaySeconds: 1
  results:
    name: results
    consumers:
      - MaxNumberOfMessages: 5
        WaitTimeSeconds: 10
  dead_letters:
    name: dead-letters
    consumers:
      - MaxNumberOfMessages: 5
        WaitTimeSeconds: 10

lambdas:
  basic:
    params:
      endpoint: "http://lambda:8080"

eventSourceMappings:
  - queue: tasks
    lambda: basic
```

Also check configs in [`./.config/local-lambda-executor/`](./.config/local-lambda-executor).

Developer Guide
---------------

Init repository:

```shell
make init
```

Build project in Docker:

```shell
make build
```

Run project in Docker:

```shell
make up
```

Stop Docker application:

```shell
make down
```

Check other [`Makefile`](./Makefile) commands by:

```shell
make help
```
