/**
 * This is a basic AWS Lambda function which randomly fails messages.
 *
 * Check AWS docs: https://docs.aws.amazon.com/lambda/latest/dg/with-sqs.html#services-sqs-batchfailurereporting.
 */
import { SQSHandler, SQSBatchItemFailure } from "aws-lambda";
import { SQSReporter } from "./sqs";
import { config } from "./config";

const shouldBatchFail = () => {
    return Math.random() > config.batchSuccessRate;
}

const shouldMessageFail = () => {
  return Math.random() > config.messageSuccessRate;
}

const lambdaHandler: SQSHandler = async (event, context) => {
    try {
        const reporter = new SQSReporter();
        await reporter.init();

        const batchItemFailures: SQSBatchItemFailure[] = [];

        if ( shouldBatchFail() ) {
            // noinspection ExceptionCaughtLocallyJS
            throw new Error("Batch failure imitation.");
        }

        for (const record of event.Records) {
            const { body } = record;
            // tslint:disable-next-line:no-console
            console.log(`Processing message "${record.messageId}" with body:`, body);

            // Report message as failed if necessary
            if ( shouldMessageFail() ) {
                // tslint:disable-next-line:no-console
                console.error(`Considering message "${record.messageId}" as failed.`);
                batchItemFailures.push({itemIdentifier: record.messageId});
            } else {
                const msgID = await reporter.report(body);
                if (msgID) {
                    // tslint:disable-next-line:no-console
                    console.log(`Sent report message "${msgID}" in response to "${record.messageId}".`);
                }
            }
        }

        return {
            batchItemFailures: batchItemFailures,
            config: config,
        };
    } catch (err) {
        // tslint:disable-next-line:no-console
        console.log(err);
        // This is the simplest way to say that the entire batch is failed
        return {
            batchItemFailures: [{
                itemIdentifier: null,
            }],
            errorMessage: err.message,
            config: config,
        };
    }
};

export { lambdaHandler };
