import { Message } from "@aws-sdk/client-sqs";
import { SQSBatchReader } from "../sqs/SQSBatchReader";
import { AWSLambda } from "../lambda/AWSLambda";
import { SQSQueue } from "../sqs/SQSQueue";
import { EventSourceMappingsConfig, EventSourceMappingConfig } from "../interfaces";
import { sqsPayload } from "../lambda/payloads";
import { logging } from "../logging";

const log = logging();

const REPORT_BATCH_ITEM_FAILURES = "ReportBatchItemFailures"

class EventSourceMapper {
    protected _lambda: AWSLambda;
    protected _queue: SQSQueue;
    protected _batchReader: SQSBatchReader;
    protected _functionResponseTypes: string[];
    protected _reportBatchItemFailures: boolean;

    constructor(config: EventSourceMappingConfig, queue: SQSQueue, lambda: AWSLambda) {
        this._queue = queue;
        this._lambda = lambda;
        this._functionResponseTypes = config.params.FunctionResponseTypes;
        this._reportBatchItemFailures = this._functionResponseTypes.indexOf(REPORT_BATCH_ITEM_FAILURES) >= 0;
        this._batchReader = new SQSBatchReader(
            {
                QueueUrl: null,
                MaxNumberOfMessages: config.params.BatchSize,
                MessageAttributeNames: ["All"],
                AttributeNames: ["All"],
                WaitTimeSeconds: 10
            },
            queue, config.params.BatchSize, config.params.MaximumBatchingWindowInSeconds,
            this.messageHandler.bind(this)
        );
    }

    async start() {
        await this._batchReader.start()
    }

    async messageHandler(messages: Message[]) {
        log.info(`Sending ${messages.length} messages from queue "${this._queue.id}" to lambda "${this._lambda.id}"...`);

        try {
            const response = await this._lambda.invoke(sqsPayload(messages));
            log.debug(`Response from lambda "${this._lambda.id}" processing ${messages.length} messages from queue "${this._queue.id}":`, response);
            log.info(`Got responce from lambda "${this._lambda.id}" for ${messages.length} messages from queue "${this._queue.id}".`);
            if (this._reportBatchItemFailures) {
                return response.Payload;
            } else return true;
        } catch (err) {
            log.error(`Failed to process ${messages.length} messages from queue "${this._queue.id}" at lambda "${this._lambda.id}":`, err);
            return false;
        }
    }
}

const createEventSourceMappings = async (
    config: EventSourceMappingsConfig,
    queues: Map<string, SQSQueue>,
    lambdas: Map<string, AWSLambda>
) => {
    const mappers: EventSourceMapper[] = [];
    for (const mapping of config) {
        log.debug(`Creating event source mapping for queue "${mapping.queue}" and lambda "${mapping.lambda}"...`);

        const mapper = new EventSourceMapper(mapping, queues.get(mapping.queue), lambdas.get(mapping.lambda));
        await mapper.start();

        mappers.push(mapper);
        log.info(`Configured event source mapping for queue "${mapping.queue}" and lambda "${mapping.lambda}".`);
    }
    return mappers;
}

export { EventSourceMapper, createEventSourceMappings }
