import { SendMessageCommand } from "@aws-sdk/client-sqs";
import { SQSProducerConfig } from "../interfaces";
import { SQSQueue } from "./SQSQueue";
import { logging } from "../logging";

const log = logging();

export class SQSProducer {
    protected _config: SQSProducerConfig;
    protected _queue: SQSQueue;

    constructor(config: SQSProducerConfig, queue: SQSQueue) {
        this._config = config;
        this._queue = queue;
    }

    async start() {
        log.debug(`Starting producer for queue "${this._queue}":`, this._config);

        setInterval(async () => {
            const params = {
                ...{
                    MessageBody: this._config.body,
                    QueueUrl: this._queue.url
                }, ...this._config.params || {}
            };

            log.debug(`Sending message to queue "${this._queue.id}":`, params);

            const response = await this._queue.sqs.send(new SendMessageCommand(params));
            log.debug(`Message sent to queue "${this._queue.id}". MessageID: "${response.MessageId}"`);

        }, this._config.timeout * 1000);

        log.warn(`Configured producer for queue "${this._queue.id}".`);
    }
}
