import { ReceiveMessageCommandInput } from "@aws-sdk/client-sqs";

interface SQSProducerConfig {
    queue: string;
    timeout: number;
    body: string;
    params: any;
}
type SQSProducersConfig = SQSProducerConfig[];

type SQSConsumerConfig = ReceiveMessageCommandInput;
type SQSConsumersConfig = SQSConsumerConfig[];

interface SQSQueueConfig {
    name: string;
    region?: string;
    endpoint?: string;
    producers?: SQSProducersConfig;
    consumers?: SQSConsumersConfig;
}
type SQSQueuesConfig = Map<string, SQSQueueConfig>;

interface LambdaConfigParams {
    functionName?: string,
    apiVersion?: string,
    endpoint: string,
    sslEnabled?: boolean,
    region?: string,
    accessKeyId?: string,
    secretAccessKey?: string,
}
interface LambdaConfig {
    name?: string;
    params: LambdaConfigParams;
}
type LambdasConfig = Map<string, LambdaConfig>

/**
 * Check AWS docs: https://docs.aws.amazon.com/lambda/latest/dg/API_CreateEventSourceMapping.html
 */
interface EventSourceMappingConfigParams {
    BatchSize: number;
    FunctionResponseTypes?: string[];
    MaximumBatchingWindowInSeconds?: number;
}
interface EventSourceMappingConfig {
    queue: string;
    lambda: string;
    params?: EventSourceMappingConfigParams;
}
type EventSourceMappingsConfig = EventSourceMappingConfig[];

interface Config {
    queues: SQSQueuesConfig;
    events: SQSProducersConfig;
    lambdas: LambdasConfig;
    eventSourceMappings: EventSourceMappingsConfig;
}

export {
    Config,
    SQSQueueConfig,
    SQSQueuesConfig,
    SQSProducerConfig,
    SQSProducersConfig,
    SQSConsumerConfig,
    SQSConsumersConfig,
    LambdaConfig,
    LambdasConfig,
    EventSourceMappingConfigParams,
    EventSourceMappingConfig,
    EventSourceMappingsConfig
};
