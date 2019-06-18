import { createServer, proxy } from 'aws-serverless-express';
import { expressApp } from './app';

export const app = (event, context, callback): void => {
  const server = createServer(expressApp);

  context.succeed = (response): void => {
    server.close();
    callback(null, response);
  };

  return proxy(server, event, context);
};
