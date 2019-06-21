import * as WebApi from 'seratch-slack-types/web-api';
import { Request, Response, Application } from 'express';
import { App, ExpressReceiver, ButtonAction, BlockAction, SlackActionMiddlewareArgs, LogLevel } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { startRound, getRoundData, addVote, removeVote, endRound } from './db';

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET as string
});

const expressApp: Application = expressReceiver.app;

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  logLevel: LogLevel.DEBUG,
  receiver: expressReceiver
});

/**
 * Slash command
 */
app.command('/pub', async ({ ack, body, respond }): Promise<void> => {
  ack();

  const channelId: string = body.channel_id;

  try {
    await startRound(channelId);
  } catch (error) {
    return respond({
      response_type: 'ephemeral',
      text: 'There is a pub vote in this channel already',
    });
  }

  console.log(`Starting pub round in ${channelId}`);

  respond({
    response_type: 'in_channel',
    text: '',
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": "Soooooooo, Pub? :beers:"
        },
      },
      {
        "type": "actions",
        "elements": [
          {
            "type": "button",
            "action_id": "yes_action",
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": "Yes"
            },
            "value": channelId
          },
          {
            "type": "button",
            "action_id": "no_action",
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": "No"
            },
            "value": channelId
          },
          {
            "type": "button",
            "action_id": "end_action",
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": "End Round"
            },
            "value": channelId
          }
        ]
      }
    ]
  });
});

/**
 * Yes button action
 */
app.action('yes_action', async ({ body, action, ack, respond }: SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): Promise<void> => {
  ack();

  const channelId: string = action.value;
  const userId: string = body.user.id;
  const userName: string = body.user.name;

  console.log(`Someones on it ${userId}`);

  const data = await getRoundData(channelId);
  const users: string[] = data.Item ? data.Item.users as string[] : [];

  if(users.includes(userId)) {
    return respond({
      response_type: 'ephemeral',
      replace_original: false,
      text: 'You have already voted',
    });
  }

  await addVote(channelId, userId);

  respond({
    response_type: 'ephemeral',
    replace_original: false,
    text: `Yass ${userName}!`,
  });
});

/**
 * No button action
 */
app.action('no_action', async ({ body, action, ack, respond }: SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): Promise<void> => {
  ack();

  const channelId: string = action.value;
  const userId: string = body.user.id;

  console.log(`Someone is not ${userId}`);

  await removeVote(channelId, userId);

  respond({
    response_type: 'ephemeral',
    replace_original: false,
    text: 'Well you suck',
  });
});

/**
 * End round button action
 */
app.action('end_action', async ({ body, ack, action, respond }: SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): Promise<void> => {
  ack();

  console.log(`Round ended by ${body.user.id}`);

  const data = await endRound(action.value);
  const users: string[] = data.Attributes ? data.Attributes.users as string[] : [];

  const count: number = users.length;
  const userString: string = users.map((user): string => `<@${user}>`).join(', ');

  let text: string;

  if (count >= 3) {
    text = `Round ended with ${count} people on it: ${userString} Assemble!`;
  } else {
    text = 'Not enough people are on it, try harder next time';
  }

  respond({
    response_type: 'in_channel',
    replace_original: true,
    text,
  });
});

/**
 * Bot installation routes
 */
expressApp.get('/slack/installation', (_req: Request, res: Response): void => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const scopesCsv = 'commands,users:read,users:read.email,team:read';
  const state = 'randomly-generated-string';
  const url = `https://slack.com/oauth/authorize?client_id=${clientId}&scope=${scopesCsv}&state=${state}`;
  res.redirect(url);
});

expressApp.get('/slack/oauth', (req: Request, res: Response): void => {
  const client = new WebClient(process.env.SLACK_API_TOKEN);

  client.oauth.access({
    code: req.query.code,
    client_id: process.env.SLACK_CLIENT_ID as string,
    client_secret: process.env.SLACK_CLIENT_SECRET as string,
    redirect_uri: process.env.SLACK_REDIRECT_URI as string
  }).then((apiRes: WebApi.OauthAccessResponse): void => {
    if (apiRes.ok) {
      console.log(`Succeeded! ${JSON.stringify(apiRes)}`)
      res.status(200).send(`Thanks!`);
    } else {
      console.error(`Failed because of ${apiRes.error}`)
      res.status(500).send(`Something went wrong! error: ${apiRes.error}`);
    }
  }).catch((reason): void => {
    console.error(`Failed because ${reason}`)
    res.status(500).send(`Something went wrong! reason: ${reason}`);
  });
});

app.error((error): void => {
  console.error(error);
});

export default expressApp;
