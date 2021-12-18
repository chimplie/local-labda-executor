/**
 * This express application emulates containerized lambda function to some extent.
 * Check AWS docs: https://docs.aws.amazon.com/lambda/latest/dg/images-test.html.
 *
 * We use `lambda-local` to invoke function with proper context.
 * Check the docs: https://github.com/ashiina/lambda-local.
 */
"use strict";
const path = require('path')
const express = require('express')
const bodyParser = require('body-parser')
const lambdaLocal = require('lambda-local')
const dotenv = require('dotenv')

dotenv.config()

const functionName = process.env.LAMBDA_FUNCTION_NAME || 'function'
const invocationUrl = `/2015-03-31/functions/${functionName}/invocations`
const port = process.env.LAMBDA_PORT || 8080

const app = express()

// We accept all headers:
app.use(bodyParser.json({type: "*/*"}))

app.post(invocationUrl, async (req, res) => {
  console.log('Request body:', req.body)

  try {
    const result = await lambdaLocal.execute({
      lambdaPath: path.join(__dirname, 'dist', 'app'),
      lambdaHandler: 'lambdaHandler',
      event: req.body,
      timeoutMs: 3000,
    })

    console.log("Function result:", result)
    res.status(result.statusCode).send(result.body)
  } catch (err) {
    console.log("Error:", err)
    res.status(500).send("Error")
  }
})

app.listen(port, () => {
  console.log(`Local lambda server started listening on port: ${port}`)
})
