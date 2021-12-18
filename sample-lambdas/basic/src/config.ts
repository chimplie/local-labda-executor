import {AWS_REGION, BATCH_SUCCESS_RATE, MESSAGE_SUCCESS_RATE} from "./defaults";

export const config = {
    batchSuccessRate: Number(process.env.BATCH_SUCCESS_RATE || BATCH_SUCCESS_RATE),
    messageSuccessRate: Number(process.env.MESSAGE_SUCCESS_RATE || MESSAGE_SUCCESS_RATE),
    awsRegion: process.env.AWS_REGION || AWS_REGION,
    sqsEndpoint: process.env.SQS_ENDPOINT,
    resultSQSQueue: process.env.SQS_RESULTS_QUEUE,
}