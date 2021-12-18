import { SQSConsumer } from "./SQSConsumer";
import { SQSConsumerConfig } from "../interfaces";
import { SQSQueue } from "./SQSQueue";
import { SQSBatchResponse } from "aws-lambda";
import {
    Message,
    ChangeMessageVisibilityBatchCommand,
    ChangeMessageVisibilityBatchCommandInput
} from "@aws-sdk/client-sqs";
import { logging } from "../logging";

const log = logging();

type BatchValidationResponse = boolean | SQSBatchResponse;
type SQSBatchHandler = (messages: Message[], queue: SQSQueue) => Promise<BatchValidationResponse>;

const DEFAULT_HANDLER: SQSBatchHandler = async (messages: Message[], queue: SQSQueue) => {
    log.info(`Received ${messages.length} from queue ${queue.id}.`)
    return true;
}

class SQSBatchReader extends SQSConsumer {
    protected _batchSize: number;
    protected _handler: SQSBatchHandler;
    protected _messageBuffer: Message[];
    protected _maxBatchWindowTimeoutMs: number;
    protected _batchTimeoutID: any;
    protected _proceedImmediately: boolean;

    constructor(
        config: SQSConsumerConfig, queue: SQSQueue,
        batchSize: number, maxBatchWindowInSeconds: number, handler?: SQSBatchHandler) {
        super(config, queue);

        this._batchSize = batchSize;
        this._maxBatchWindowTimeoutMs = maxBatchWindowInSeconds * 1000;
        this._config.MaxNumberOfMessages = batchSize;
        this._messageBuffer = [];
        this._handler = handler || DEFAULT_HANDLER;
        this._batchTimeoutID = null;
        this._proceedImmediately = false;
    }

    async start(): Promise<void> {
        await super.start();
        this.restartBatchWindowTimeout();
    }

    public set handler(handler: SQSBatchHandler) {
        this._handler = handler;
    }

    shouldProcessBatch(): boolean {
        return (this._messageBuffer.length >= this._batchSize) || this._proceedImmediately;
    }

    async consume(messages: Message[]): Promise<void> {
        // Keep messages away from clients
        await this.changeMessagesVisibility(messages, this._maxBatchWindowTimeoutMs * 2);
        // Append buffer
        this._messageBuffer.push(...messages);
        // Continue waiting for messages if buffer is too small unless we want to proceed immediately
        if (!this.shouldProcessBatch()) {
            log.debug(`Buffer is too small ${this._messageBuffer.length} < ${this._batchSize} and immediate processing is OFF. Skipping...`);
            return;
        }

        // Process batch
        await this.processBatch()
    }

    async processBatch() {
        // Extract batch from buffer
        const messagesBatch = this._messageBuffer.slice(0, 10);
        this._messageBuffer.splice(0, 10);
        // Skip if batch is empty
        if (messagesBatch.length === 0) return;

        // Handle messages
        log.debug(`Processing ${messagesBatch.length} messages from queue "${this._queue.id}"...`);
        const validationResponse = await this._handler(messagesBatch, this._queue);
        // Validate batch, delete consumed messages and release failed messages to queue
        await this.commitBatch(messagesBatch, validationResponse);
    }

    async commitBatch(messages: Message[], validationResponse: BatchValidationResponse) {
        let consumedMessages: Message[];
        let failedMessages: Message[];
        [consumedMessages, failedMessages] = await this.validateBatch(messages, validationResponse);

        // Release failed messages
        if (consumedMessages.length > 0) {
            await this.changeMessagesVisibility(failedMessages, 0);
        }
        // Delete consumed messages
        if (consumedMessages.length > 0) {
            await this.deleteMessages(consumedMessages);
            this.restartBatchWindowTimeout();
        }

        log.info(`Batch success rate for queue "${this._queue.id}": ${consumedMessages.length}/${messages.length}.`);
    }

    /**
     * Validates messages from batch given against validation response and commit batch.
     *
     * For validation conditions check AWS docs on batch failures: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting
     *
     * @param messages array of messages
     * @param validationResponse validation response
     */
    async validateBatch(messages: Message[], validationResponse: BatchValidationResponse): Promise<[Message[], Message[]]> {
        const failedMessages: Message[] = [];
        const messagesDict: Map<string, Message> = new Map<string, Message>();
        for (const msg of messages) {
            messagesDict.set(msg.MessageId, msg);
        }

        // All messages processed
        if (validationResponse === true) {
            return [messages, []];
        }
        // All messages failed
        if (validationResponse === false) {
            return [[], messages];
        }

        // --------------------------------------------------------------
        // For batch responses which support item failure reporting
        // --------------------------------------------------------------
        if ("batchItemFailures" in (validationResponse as SQSBatchResponse)) {
            /*
             * The following values should be considered as complete success:
             *  - An empty batchItemFailures list
             *  - A null batchItemFailures list
             */
            if (
                (validationResponse as SQSBatchResponse).batchItemFailures === null ||
                (validationResponse as SQSBatchResponse).batchItemFailures.length === 0
            ) {
                // Everything is committed
                return [messages, []];
            }
            for (const failure of (validationResponse as SQSBatchResponse).batchItemFailures) {
                /*
                 * Wrong message IDs should be considered as complete failure of the batch:
                 *  - An empty string itemIdentifier
                 *  - A null itemIdentifier
                 *  - An itemIdentifier with a bad key name
                 *  - An itemIdentifier value with a message ID that doesn't exist
                 */
                if (
                    failure.itemIdentifier === "" ||
                    failure.itemIdentifier === null ||
                    !messagesDict.has(failure.itemIdentifier)
                ) {
                    // Everything is failed
                    return [[], messages];
                }
                // Add failed message to the list
                failedMessages.push(messagesDict.get(failure.itemIdentifier));
                // Delete from committed messages
                messagesDict.delete(failure.itemIdentifier);
            }
        }

        // Report consumed and failed messages
        return [Array.from(messagesDict.values()), failedMessages];
    }

    async onBatchWindowEnds() {
        log.info(`Batch timeout of ${this._maxBatchWindowTimeoutMs}ms expired, proceeding with buffer of size ${this._messageBuffer.length}...`);
        // From now we want to proceed with any number of messages
        this._proceedImmediately = true;
        // Force running batch processing
        await this.processBatch();
    }

    restartBatchWindowTimeout() {
        log.info(`Restarting batch window timeout for ${this._maxBatchWindowTimeoutMs}ms. No immediate processing for a while.`);
        // Stop proceeding messages immediately
        this._proceedImmediately = false;
        // Clear timeout
        if (this._batchTimeoutID !== null) {
            clearTimeout(this._batchTimeoutID);
            this._batchTimeoutID = null;
        }
        // Wait for the next window
        this._batchTimeoutID = setTimeout(this.onBatchWindowEnds.bind(this), this._maxBatchWindowTimeoutMs)
    }

    async changeMessagesVisibility(messages: Message[], timeout: number) {
        const params: ChangeMessageVisibilityBatchCommandInput = {
            QueueUrl: this._queue.url,
            Entries: messages.map((msg) => {
                return {
                    Id: msg.MessageId,
                    ReceiptHandle: msg.ReceiptHandle,
                    VisibilityTimeout: timeout,
                }
            })
        }

        try {
            await this._queue.sqs.send(new ChangeMessageVisibilityBatchCommand(params));
            log.debug(`Put ${messages.length} messages back to queue "${this._queue.id}".`);
        } catch (err) {
            log.error(`Failed to to put ${messages.length} messages back to queue "${this._queue.id}":`, err);
        }
    }
}

export { SQSBatchReader, SQSBatchHandler, BatchValidationResponse };
