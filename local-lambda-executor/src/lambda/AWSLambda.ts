import { Lambda, InvokeCommandOutput } from "@aws-sdk/client-lambda";
import { LambdaConfig, LambdasConfig } from "../interfaces";
import { logging } from "../logging";

const log = logging();

const DEFAULT_FUNCTION_NAME = "function";
const LAMBDA_PARAMS_DEFAULTS = {
    apiVersion: '2015-03-31',
    sslEnabled: false,
    region: 'us-east-1',
    accessKeyId: 'any',
    secretAccessKey: 'any'
}

interface InvokeCommandJSONOutput extends Omit<InvokeCommandOutput, 'Payload'> {
    Payload?: any;
}

class AWSLambda {
    protected _id: string;
    protected _name: string;
    protected lambda: Lambda;

    constructor(id: string, config: LambdaConfig) {
        this._id = id;
        this._name = config.name || DEFAULT_FUNCTION_NAME;
        this.lambda = new Lambda({...LAMBDA_PARAMS_DEFAULTS, ...config.params});
    }

    public get id() {
        return this._id;
    }
    public get name() {
        return this._name;
    }

    async invoke (payloadJSON: any): Promise<InvokeCommandJSONOutput> {
        const response = await this.lambda.invoke({
            FunctionName: this._name,
            Payload: new TextEncoder().encode(JSON.stringify(payloadJSON)),
        });

        const parsedResponse: InvokeCommandJSONOutput = response;
        parsedResponse.Payload = JSON.parse(new TextDecoder().decode(response.Payload));

        return parsedResponse;
    }
}

const loadLambdas = (config: LambdasConfig): Map<string, AWSLambda> => {
    const lambdas = new Map<string, AWSLambda>();
    for (const [key, value] of config) {
        const lambda = new AWSLambda(key, value);

        log.warn(`Configured AWS Lambda client: ${lambda.id} => ${lambda.name}.`);
        log.debug(`Lambda ${lambda.id} => ${lambda.name} configured:`, lambda)
        lambdas.set(key, lambda);
    }
    return lambdas;
}

export {
    AWSLambda,
    loadLambdas,
};
