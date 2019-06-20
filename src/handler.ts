import { createServer, proxy } from 'aws-serverless-express';
import { APIGatewayEvent, Context, Callback } from 'aws-lambda';
import expressApp from './app';

export const app = (
  event: APIGatewayEvent,
  context: Context,
  callback: Callback
): any => {
  const server = createServer(expressApp);

  context.succeed = (response: string): void => {
    server.close();
    callback(null, response);
  };

  return proxy(server, event, context);
};
