import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import chromium from '@sparticuz/chromium';
import puppeteer from 'puppeteer-core';

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
    let result = null;
    let browser = null;

    try {
        const customArgs = [
            ...chromium.args,
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-gpu',
            '--no-first-run',
            '--no-zygote',
            '--single-process',
        ];
        const options = {
            args: customArgs,
            defaultViewport: chromium.defaultViewport,
            executablePath: await chromium.executablePath('/opt/nodejs/node_modules/@sparticuz/chromium/bin'),
            headless: chromium.headless,
            ignoreHTTPSErrors: true,
        };

        console.log('puppeteer.launch(options)');
        browser = await puppeteer.launch(options);

        console.log('await browser.newPage();');
        let page = await browser.newPage();
        const content = `<h1>Hello World</h1>`;
        await page.setContent(content, {
            waitUntil: ['load'], // "networkidle0" is too late
        });
        const pdf = await page.pdf();
        console.log('pdf:', pdf);

        const result = pdf.toString('base64');

        // console.log('page.goto');
        // await page.goto(event.url || 'https://example.com');

        // console.log('page.title()');
        // result = await page.title();
        console.log('result:', result);

        return {
            statusCode: 200,
            body: result,
        };
    } catch (error) {
        return {
            statusCode: 500,
            body: error instanceof Error ? error.message : String(error),
        };
    } finally {
        if (browser !== null) {
            await browser.close();
        }
    }
};

/*
export const lambdaHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    try {
        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'hello world',
            }),
        };
    } catch (err) {
        console.log(err);
        return {
            statusCode: 500,
            body: JSON.stringify({
                message: 'some error happened',
            }),
        };
    }
};
*/
