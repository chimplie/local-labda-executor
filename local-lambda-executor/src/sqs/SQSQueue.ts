import { GetQueueUrlCommand, SQS } from "@aws-sdk/client-sqs";
import { SQSQueueConfig, SQSProducersConfig, SQSConsumersConfig } from "../interfaces";
import { SQSProducer } from "./SQSProducer";
import { SQSConsumer } from "./SQSConsumer";
import { logging } from "../logging";

const log = logging();

class SQSQueue {
    protected _id: string;
    protected _name: string;
    protected _region: string;
    protected _endpoint: string;
    protected _sqs?: SQS;
    protected _url?: string;
    protected _producersConfig: SQSProducersConfig;
    protected _producers: SQSProducer[];
    protected _consumersConfig: SQSConsumersConfig;
    protected _consumers: SQSConsumer[];

    constructor(id: string, config: SQSQueueConfig) {
        this._id = id;
        this._name = config.name;
        this._region = config.region;
        this._endpoint = config.endpoint;
        this._producersConfig = config.producers || [];
        this._producers = this._producersConfig.map((producerConfig) => {
            return new SQSProducer(producerConfig, this);
        });
        this._consumersConfig = config.consumers || [];
        this._consumers = this._consumersConfig.map((consumerConfig) => {
            return new SQSConsumer(consumerConfig, this);
        });
    }

    public get id() {
        return this._id;
    }
    public get name() {
        return this._name;
    }
    public get url() {
        return this._url;
    }
    public get sqs() {
        return this._sqs;
    }

    async activate() {
        log.debug(`Loading queue:`, this);

        this._sqs = new SQS({
            region: this._region,
            endpoint: this._endpoint
        });
        const queueUrlResponse = await this._sqs.send(new GetQueueUrlCommand({QueueName: this.name}));
        this._url = queueUrlResponse.QueueUrl;

        log.warn(`Configured queue "${this._id}". URL:`, this._url);

        log.debug(`Configuring producers for queue "${this._id}"...`);
        for (const producer of this._producers) {
            await producer.start();
        }

        log.debug(`Configuring consumers for queue "${this._id}"...`);
        for (const consumer of this._consumers) {
            await consumer.start();
        }
    }
}

const activateSQSQueues = async (queuesConfig: Map<string, SQSQueueConfig>): Promise<Map<string, SQSQueue>> => {
    const sqsQueues = new Map<string, SQSQueue>();

    for (const [id, config] of queuesConfig) {
        const sqsQueue = new SQSQueue(id, config);
        await sqsQueue.activate();
        sqsQueues.set(id, sqsQueue);
    }

    return sqsQueues;
}

export { SQSQueue, activateSQSQueues };
