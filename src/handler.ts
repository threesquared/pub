import serverless from 'serverless-http';
import { expressApp } from './app';

export const app = serverless(expressApp);
