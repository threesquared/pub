import { createServer, proxy } from 'aws-serverless-express';
import { APIGatewayEvent, Context, Callback } from 'aws-lambda';
import { Server } from 'http';
import expressApp from './slack';

export const app = (
  event: APIGatewayEvent,
  context: Context,
  callback: Callback,
): Server => {
  const server = createServer(expressApp);

  context.succeed = (response: string): void => {
    server.close();
    callback(null, response);
  };

  return proxy(server, event, context);
};
