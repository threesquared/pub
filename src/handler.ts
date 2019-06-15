import serverless from 'serverless-http';
import { expressApp } from './app';

const handler = serverless(expressApp);

export const app = async (event, context): Promise<any> => {
  const result = await handler(event, context);

  console.log('HERE');

  return result;
};
