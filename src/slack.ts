import { Request, Response, Application } from 'express';
import { App, ExpressReceiver, ButtonAction, BlockAction, SlackActionMiddlewareArgs, LogLevel } from '@slack/bolt';
import { WebClient, WebAPICallResult } from '@slack/web-api';
import { start, yes, no, end } from './app';

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET as string,
});

const expressApp: Application = expressReceiver.app;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  logLevel: LogLevel.DEBUG,
  receiver: expressReceiver,
});

/**
 * Main slash command
 */
app.command('/pub', async ({ ack, body, respond }): Promise<void> => {
  ack();

  const channelId: string = body.channel_id;
  const userId: string = body.user_id;

  const response = await start(channelId, userId);

  return respond(response);
});

/**
 * Yes button action
 */
app.action('yes_action', async ({
  body,
  action,
  ack,
  respond,
}: SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): Promise<void> => {
  ack();

  const channelId: string = action.value;
  const userId: string = body.user.id;
  const userName: string = body.user.name;

  const response = await yes(channelId, userId, userName);

  return respond(response);
});

/**
 * No button action
 */
app.action('no_action', async ({
  body,
  action,
  ack,
  respond,
}: SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): Promise<void> => {
  ack();

  const channelId: string = action.value;
  const userId: string = body.user.id;

  const response = await no(channelId, userId);

  return respond(response);
});

/**
 * End round button action
 */
app.action('end_action', async ({
  body,
  ack,
  action,
  respond,
}: SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): Promise<void> => {
  ack();

  const channelId: string = action.value;
  const userId: string = body.user.id;

  const response = await end(channelId, userId);

  return respond(response);
});

/**
 * Bot installation routes
 */
expressApp.get('/slack/installation', (_req: Request, res: Response): void => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const scopesCsv = 'commands,bot,chat:write:bot';
  const state = Math.random().toString(36).substring(2, 15);
  const url = `https://slack.com/oauth/authorize?client_id=${clientId}&scope=${scopesCsv}&state=${state}`;

  res.redirect(url);
});

expressApp.get('/slack/oauth', (req: Request, res: Response): void => {
  const client = new WebClient();

  client.oauth.access({
    code: req.query.code,
    client_id: process.env.SLACK_CLIENT_ID as string,
    client_secret: process.env.SLACK_CLIENT_SECRET as string,
    redirect_uri: process.env.SLACK_REDIRECT_URI as string,
  }).then((apiRes: WebAPICallResult): void => {
    if (apiRes.ok) {
      console.log(`Succeeded! ${JSON.stringify(apiRes)}`);
      res.status(200).send('Thanks!');
    } else {
      console.error(`Failed because of ${apiRes.error}`);
      res.status(500).send(`Something went wrong! error: ${apiRes.error}`);
    }
  }).catch((reason): void => {
    console.error(`Failed because ${reason}`);
    res.status(500).send(`Something went wrong! reason: ${reason}`);
  });
});

app.error((error): void => {
  console.error(error);
});

export default expressApp;
