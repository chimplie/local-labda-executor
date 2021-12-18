import dotenv from "dotenv";
import YAML from "yaml";
import { readFileSync } from "fs";
import { Config, LambdaConfig, SQSQueueConfig, EventSourceMappingConfig, EventSourceMappingConfigParams } from "./interfaces";
import { AWS_REGION, SQS_ENDPOINT } from "./defaults";
import { logging } from "./logging";

const log = logging();

const DEFAULT_ESM_PARAMS: EventSourceMappingConfigParams = {
  BatchSize: 10,
  FunctionResponseTypes: [],
  MaximumBatchingWindowInSeconds: 10
}

const normalizeSQSQueueSettings = (queueSettings: SQSQueueConfig): SQSQueueConfig => {
  queueSettings.region =
      queueSettings.region ||
      process.env.AWS_REGION ||
      AWS_REGION;
  queueSettings.endpoint =
      queueSettings.endpoint ||
      process.env.SQS_ENDPOINT ||
      SQS_ENDPOINT;

  return queueSettings;
}

const normalizeEventSourceMappingSettings = (settings: EventSourceMappingConfig): EventSourceMappingConfig => {
  settings.params = {...DEFAULT_ESM_PARAMS,  ...(settings.params || {})};
  return settings;
}


const loadConfig = (): Config => {
  dotenv.config();
  const config = YAML.parse(readFileSync('./config/config.yml', 'utf-8'));

  log.debug("Loaded config:", config);

  config.queues = new Map<string, SQSQueueConfig>(Object.entries(config.queues || {}));
  config.lambdas = new Map<string, LambdaConfig>(Object.entries(config.lambdas || {}));

  for (const [key, value] of config.queues) {
    config.queues[key] = normalizeSQSQueueSettings(value);
  }

  config.eventSourceMappings = config.eventSourceMappings.map(normalizeEventSourceMappingSettings);

  return config;
}

export { loadConfig }
