import awsServerlessExpress from 'aws-serverless-express';
import { expressApp } from './app';
const server = awsServerlessExpress.createServer(expressApp);

export const app = (event, context): Promise<void> => awsServerlessExpress.proxy(server, event, context, 'PROMISE').promise;
