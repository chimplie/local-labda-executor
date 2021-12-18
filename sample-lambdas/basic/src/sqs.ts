import { SQS } from "@aws-sdk/client-sqs";
import { config } from "./config";


class SQSReporter {
    endpoint?: string;
    queue?: string;
    client: SQS;
    url?: string;

    constructor() {
        const region = config.awsRegion;
        this.endpoint = config.sqsEndpoint;
        this.queue = config.resultSQSQueue;
        this.url = null;

        this.client = new SQS({
            region: region,
            endpoint: this.endpoint
        });
    }

    async init() {
        // We don't want to do anything if queue is not provided
        if (!this.queue) return;

        this.url = (await this.client.getQueueUrl({
            QueueName: this.queue
        })).QueueUrl;
    }

    async report(body: string) {
        // We don't want to do anything if queue is not provided
        if (!this.queue) return false;

        const response = await this.client.sendMessage({
            QueueUrl: this.url,
            MessageBody: body
        });
        return response.MessageId;
    }
}

export { SQSReporter };
