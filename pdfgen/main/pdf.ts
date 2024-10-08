import path, { extname, join } from 'path';
import fs from 'fs';

import chromium from '@sparticuz/chromium';
import puppeteer, { Page, PDFOptions } from 'puppeteer-core';
import { readdir } from 'fs/promises';

const listDirectory = async (directoryPath: string): Promise<void> => {
    try {
        const files: string[] = await readdir(directoryPath);
        console.log(`Contents of ${directoryPath}:`);
        files.forEach((file) => {
            console.log(file);
        });
    } catch (error) {
        console.error(`Error reading directory: ${(error as Error).message}`);
    }
};

const fondDirectoryPath = '/opt/.fonts';
listDirectory(fondDirectoryPath);
process.env.FONTCONFIG_PATH = fondDirectoryPath;

chromium.setHeadlessMode = true;
chromium.setGraphicsMode = false;

const readFonts = async () => {
    const fontExtensions = ['.woff', '.woff2', '.ttf'];
    const files: string[] = await readdir(fondDirectoryPath);
    const fontFiles = files.filter((file) => fontExtensions.includes(extname(file)));
    for (const file of fontFiles) {
        const fontFile = join(fondDirectoryPath, file);
        console.log('readFont', fontFile);
        await chromium.font(fontFile);
    }
};

export type OutputPdfOption = {
    key: string;
    content: string;
    option?: {
        pdf?: PDFOptions;
    };
};

// @see https://github.com/puppeteer/puppeteer/blob/main/docs/troubleshooting.md#running-puppeteer-on-gitlabci
// @see https://qiita.com/masaminh/items/eb9188c15de60b6b1de6#%E3%83%8F%E3%83%9E%E3%81%A3%E3%81%9F%E5%86%85%E5%AE%B9

export const outputPdf = async (params: OutputPdfOption) => {
    const startTime = performance.now();
    // return await Promise.all(targets.map((target) => openAndSave(target)));
    const ret = await openAndSave(params);
    console.log(`outputPdf: ${performance.now() - startTime}`);
    return ret;
};

const defaultPdfOption: PDFOptions = {
    format: 'A4',
    printBackground: true,
    displayHeaderFooter: true,
};

let page: Page | null = null;

const getPage = async () => {
    if (page) {
        return page;
    }

    const startTime = performance.now();

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

    await readFonts();

    const browser = await puppeteer.launch(options);

    console.log(`openAndSave: puppeteer.launch: ${performance.now() - startTime}`);
    const startTime1 = performance.now();
    page = await browser.newPage();
    page.on('pageerror', (error) => {
        console.log('error on console', error.message);
    });
    console.log(`openAndSave: browser.newPage: ${performance.now() - startTime1}`);
    return page;
};

const openAndSave = async ({ key, content, option }: OutputPdfOption) => {
    const page = await getPage();
    const startTime2 = performance.now();

    // @see https://github.com/puppeteer/puppeteer/issues/728
    // page.on("request", (request) => {
    //   console.log(`Intercepted request with URL: ${request.url()}`);
    //   request.continue();
    // });
    // await page.goto(`data:text/html,${content}`, {
    //   waitUntil: 'networkidle0'
    // });

    console.log('content', content);

    await page.setContent(content, {
        // waitUntil: ['load'], // "networkidle0" is too late
        waitUntil: 'networkidle0',
    });

    console.log(`openAndSave: page.setContent: ${performance.now() - startTime2}`);
    const startTime3 = performance.now();

    const params = { ...defaultPdfOption, ...option?.pdf };
    let pdf;
    if (process.env.DEBUG) {
        const tmpPath = `/tmp/${key}`;
        fs.mkdirSync(path.dirname(tmpPath), { recursive: true });
        pdf = await page.pdf({ path: tmpPath, ...params });
    } else {
        pdf = await page.pdf(params);
    }
    console.log(`openAndSave: page.pdf: ${performance.now() - startTime3}`);

    return { pdf, key };
};
