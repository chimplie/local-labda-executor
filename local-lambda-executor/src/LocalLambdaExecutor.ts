import { logging } from "./logging";
import { SQSQueue, activateSQSQueues } from "./sqs/SQSQueue";
import { AWSLambda, loadLambdas } from "./lambda/AWSLambda";
import { Config } from "./interfaces";
import { EventSourceMapper, createEventSourceMappings } from "./event_source_mapping/EventSourceMapper";

const log = logging();

class LocalLambdaExecutor {
    protected _config: Config;
    protected _queues: Map<string, SQSQueue>;
    protected _lambdas: Map<string, AWSLambda>;
    protected _eventSourceMappers: EventSourceMapper[];

    constructor(config: Config) {
        this._config = config;
    }

    async startAsync() {
        log.debug(`LLE: entering the main loop.`);

        this._lambdas = loadLambdas(this._config.lambdas);
        this._queues = await activateSQSQueues(this._config.queues);
        this._eventSourceMappers = await createEventSourceMappings(
            this._config.eventSourceMappings,
            this._queues,
            this._lambdas
        )

        log.warn(`Local Lambda Executor started.`);
    }

    start() {
        setImmediate(this.startAsync.bind(this));
    }
}

export { LocalLambdaExecutor };
