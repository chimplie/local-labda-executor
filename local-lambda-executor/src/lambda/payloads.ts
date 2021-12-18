import { Message, MessageAttributeValue } from "@aws-sdk/client-sqs";

interface SQSPayloadMessageRecord {
    messageId: string;
    receiptHandle: string;
    body: string;
    attributes?: {
        [key: string]: string;
    };
    messageAttributes: {
        [key: string]: MessageAttributeValue;
    };
    md5OfBody?: string;
    eventSource?: string;
    eventSourceARN?: string;
    awsRegion?: string;
}

interface SQSPayload {
    Records: SQSPayloadMessageRecord[]
}

const sqsPayload = (messages: Message[]): SQSPayload => {
    const payload: SQSPayload = {
        Records: []
    }

    for (const msg of messages) {
        const record: SQSPayloadMessageRecord = {
            messageId: msg.MessageId,
            receiptHandle: msg.ReceiptHandle,
            body: msg.Body,
            attributes: msg.Attributes,
            messageAttributes: msg.MessageAttributes,
            md5OfBody: msg.MD5OfBody,
            eventSource: "aws:sqs",
            eventSourceARN: "aws:sqs",
            awsRegion: "us-east-1",
        }
        payload.Records.push(record);
    }

    return payload;
}

export {
    sqsPayload,
    SQSPayload,
    SQSPayloadMessageRecord,
};
