Sample Lambdas for Local Lambda Executor
----------------------------------------

SAM CLI powered TypeScript lambda functions with local execution support.

- [basic](./basic) - Code for the basic Lambda function.
  - [src/](./basic/src) — application sources.
    - [app.ts](./basic/src/app.ts) — entry point.
  - [local.js](./basic/local.js) — entrypoint for local run that emulates running a docker container.
  - [Dockerfile](./basic/Dockerfile) — application Dockerfile.
  - [.env](./basic/.env) — environment variables (should be created from
    [`./basic/.env.template`](./basic/.env.template)) as described in the main [README.md](../README.md).
- [events](./events) — Invocation events that you can use to invoke the function.
- [template.yaml](./template.yaml) — A SAM template.

The application uses several AWS resources, including Lambda functions and an SQS queue. These resources are defined in
the `template.yaml` file in this project.

Install & Run
-------------

Init repository as described in the main [README.md](../README.md).

To run lambda application as a standalone server that mimics lambda docker container (development mode):

```bash
basic$ npm run dev
```

Configuration
-------------

### Environment variables

- `BATCH_SUCCESS_RATE` — success rate for batch (default is `1.0`, all batches succeed)
- `MESSAGE_SUCCESS_RATE` — success rate for a message withing a batch (default is `1.0`, all messages succeed)
- `SQS_ENDPOINT` — SQS endpoint (for local testing)
- `SQS_RESULTS_QUEUE` — queue for publishing results (if empty no results will be published)

### [Local lambda server](./basic/local.js)

#### Environment variables

- `LAMBDA_PORT` — port for [local lambda server](./basic/local.js) (default is `8080`)
- `LAMBDA_FUNCTION_NAME` — name of the function for local server (default is `function`)

Run using SAM CLI
-----------------

To build application for the first time, run the following in your shell:

```bash
sam build
```

### Use the SAM CLI to build and test locally

Build your application with the `sam build` command.

```bash
basic$ sam build
```

Run functions locally and invoke them with the `sam local invoke` command.

```bash
basic$ sam local invoke BasicFunction --event events/event.json
```

### Fetch, tail, and filter Lambda function logs

```bash
basic$ sam logs -n BasicFunction --stack-name basic --tail
```
