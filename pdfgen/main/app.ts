import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { OpenAndSaveOption, outputPdf } from './pdf';
import { S3Client, PutObjectCommand, GetObjectCommand, PutObjectCommandInput } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import crypto from 'crypto';
import { RequestPresigningArguments } from '@aws-sdk/types';

const startTime = performance.now();

if (!process.env.AWS_S3_BUCKET) {
    throw new Error('AWS_S3_BUCKET is required');
}

/*
AWS_S3_BUCKET=pdf-test # simple bucket name
AWS_S3_BUCKET=pdf-test,pdf-test2 # multiple bucket names
*/

const buckets = process.env.AWS_S3_BUCKET.split(',');
console.log(`buckets: ${buckets}`);

let client;
if (process.env.LOCAL === 'true') {
    client = new S3Client({
        credentials: { accessKeyId: 'FAKE', secretAccessKey: 'FAKE' },
        endpoint: 'http://localstack:4566',
        forcePathStyle: true,
    });
} else {
    client = new S3Client();
}

class InputError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'InputError';
    }
}

const checkPayload = (params: ExecuteOptions) => {
    if (!params.bucket) {
        throw new InputError('params.bucket is required');
    }
    if (buckets.indexOf(params.bucket) === -1) {
        throw new InputError(`Unexpected params.bucket ${params.bucket}`);
    }
    if (!params.key) {
        throw new InputError('params.key is required');
    }
    if (!params.content) {
        throw new InputError('params.content is required');
    }

    if (params.option) {
        if (params.option.signedUrl) {
            if (typeof params.option.signedUrl !== 'boolean' && typeof params.option.signedUrl !== 'object') {
                throw new InputError('params.option.signedUrl must be boolean or object');
            }
        }
        if (params.option.pdf) {
            if (typeof params.option.pdf !== 'object') {
                throw new InputError('params.option.pdf must be object');
            }
        }
    }
};

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    const startTime = performance.now();
    try {
        let payload;
        if (event.requestContext) {
            // for function URLs
            if (event.body === null) {
                throw new InputError('event.body is required');
            }
            payload = JSON.parse(event.body);
        } else if (event.httpMethod) {
            // for API Gateway
            if (event.body === null) {
                throw new InputError('event.body is required');
            }
            payload = JSON.parse(event.body);
            /*
        } else if (event.Records && event.Records[0]?.s3) {
            // for S3
            throw new Error('Not supported');
        */
        } else {
            // for test
            payload = event;
        }

        checkPayload(payload);

        const ret = await execute(payload);
        const response: APIGatewayProxyResult = {
            statusCode: 200,
            body: JSON.stringify(ret),
        };

        console.log(`handler: ${performance.now() - startTime}`);
        return response;
    } catch (err) {
        if (err instanceof InputError) {
            console.error(`Error(400): ${err.message}`);
        } else {
            console.error(`Error(500): ${err instanceof Error ? err.message : String(err)}`);
        }
        console.error(err);
        console.log(`handler(err): ${performance.now() - startTime}`);
        throw err;
    }
};

type ExecuteOptions = OpenAndSaveOption & { bucket: string; option?: { signedUrl?: boolean | { expiresIn: number } } };

const execute = async (params: ExecuteOptions) => {
    const { pdf, key } = await outputPdf(params);

    const ret = await putToS3(pdf, params.bucket, key, params.option?.signedUrl);
    return { key, ...ret };
};

const putToS3 = async (
    pdf: Buffer,
    bucket: string,
    key: string,
    signedUrlOption?: RequestPresigningArguments | boolean,
) => {
    const params: PutObjectCommandInput = {
        Body: Buffer.from(pdf),
        Bucket: bucket,
        ContentType: 'application/pdf',
        ContentDisposition: 'inline',
        Key: key ?? `${crypto.randomUUID()}.pdf`,
    };

    const command = new PutObjectCommand(params);
    await client.send(command);

    if (signedUrlOption === undefined) {
        return {};
    }

    const getObjectCommand = new GetObjectCommand({
        Bucket: params.Bucket,
        Key: params.Key,
    });

    const getSignedUrlOption: RequestPresigningArguments = typeof signedUrlOption === 'boolean' ? {} : signedUrlOption;
    const signedUrl = await getSignedUrl(client, getObjectCommand, getSignedUrlOption);
    return { bucket, signedUrl };
};

console.log(`bootup: ${performance.now() - startTime}`);
