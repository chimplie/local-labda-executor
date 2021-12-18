import {
    Message,
    ReceiveMessageCommand,
    ReceiveMessageCommandInput,
    ReceiveMessageCommandOutput,
    DeleteMessageBatchCommand,
    DeleteMessageBatchCommandInput,
} from "@aws-sdk/client-sqs";
import { SQSConsumerConfig } from "../interfaces";
import { SQSQueue } from "./SQSQueue";
import { logging } from "../logging";

const log = logging();

class SQSConsumer {
    protected _config: SQSConsumerConfig;
    protected _queue: SQSQueue;
    protected _isStarted: boolean;

    constructor(config: SQSConsumerConfig, queue: SQSQueue) {
        this._config = config;
        this._queue = queue;
        this._isStarted = false;
    }

    async receive(): Promise<ReceiveMessageCommandOutput> {
        const receiveParams: ReceiveMessageCommandInput = {
            ...(this._config || {}),
            ...{
                QueueUrl: this._queue.url
            }
        };

        log.debug(`Pooling messages from queue "${this._queue.id}":`, receiveParams);
        return await this._queue.sqs.send(new ReceiveMessageCommand(receiveParams));
    }

    async consume(messages: Message[]) {
        log.info(`Processing ${messages.length} messages from queue "${this._queue.id}"...`);
        await this.deleteMessages(messages);
    }

    async deleteMessages(messages: Message[]) {
        log.debug(`Deleting ${messages.length} messages from queue "${this._queue.id}".`);

        const params: DeleteMessageBatchCommandInput = {
            QueueUrl: this._queue.url,
            Entries: messages.map((msg) => {
                return {
                    Id: msg.MessageId,
                    ReceiptHandle: msg.ReceiptHandle,
                }
            })
        }

        try {
            await this._queue.sqs.send(new DeleteMessageBatchCommand(params));
            log.info(`Deleted ${messages.length} messages from queue "${this._queue.id}".`);
        } catch (err) {
            log.error(`Failed to deleted ${messages.length} messages from queue "${this._queue.id}":`, err);
        }
    }

    protected async _loop() {
        while (this._isStarted) {
            const response = await this.receive();
            if ((response.Messages || []).length > 0) {
                await this.consume(response.Messages);
            } else {
                log.debug(`No messages found in queue "${this._queue.id}", proceed...`);
            }
        }
    }

    async start() {
        log.debug(`Starting consumer for queue "${this._queue.id}":`, this._config);
        this._isStarted = true;
        setImmediate(this._loop.bind(this));
        log.warn(`Consumer for queue "${this._queue.id}" started.`);
    }
}

export { SQSConsumer }
