import * as WebApi from 'seratch-slack-types/web-api';
import { Request, Response, Application } from 'express';
import { App, ExpressReceiver, ButtonAction, BlockAction, SlackActionMiddlewareArgs, LogLevel } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { DynamoDB } from 'aws-sdk'

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET as string
});

export const expressApp: Application = expressReceiver.app;

const app: App = new App({
  token: process.env.SLACK_BOT_TOKEN,
  logLevel: LogLevel.DEBUG,
  receiver: expressReceiver
});

const dynamoDb = new DynamoDB.DocumentClient();

app.client = new WebClient(process.env.SLACK_API_TOKEN);

/**
 * Slash command
 */
app.command('/pub', async ({ ack, body, respond }): Promise<void> => {
  ack();

  try {
    await dynamoDb.put({
      TableName: process.env.DYNAMODB_TABLE as string,
      Item: {
        id: body.channel_id,
        users: []
      },
      ConditionExpression: "attribute_not_exists(id)"
    }).promise();
  } catch (error) {
    return respond({
      response_type: 'ephemeral',
      text: 'There is a pub vote in this channel already',
    });
  }

  console.log(`Starting pub round in ${body.channel_id}`);

  await app.client.chat.postMessage({
    channel: body.channel_id,
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
            "value": body.channel_id
          },
          {
            "type": "button",
            "action_id": "no_action",
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": "No"
            },
            "value": "no"
          },
          {
            "type": "button",
            "action_id": "end_action",
            "text": {
              "type": "plain_text",
              "emoji": true,
              "text": "End Round"
            },
            "value": body.channel_id
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

  console.log(`Someones on it ${body.user.id}`);

  const data = await dynamoDb.update({
    TableName: process.env.DYNAMODB_TABLE as string,
    Key: {
      id: action.value
    },
    UpdateExpression: 'SET #users = list_append(#users, :value)',
    ExpressionAttributeNames: {
      '#users': 'users',
    },
    ExpressionAttributeValues: {
      ':value': [body.user.id],
    },
    ReturnValues: 'ALL_NEW',
  }).promise();

  const users: string[] = data.Attributes ? data.Attributes.users : [];

  respond({
    response_type: 'ephemeral',
    replace_original: false,
    text: `Yass ${body.user.name}, ${users.length} people in so far!`,
  });
});

/**
 * No button action
 */
app.action('no_action', async ({ body, ack, respond }): Promise<void> => {
  ack();

  console.log(`Someone is not ${body.user.id}`);

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

  const data = await dynamoDb.delete({
    TableName: process.env.DYNAMODB_TABLE as string,
    Key: {
      id: action.value
    },
    ReturnValues: 'ALL_OLD'
  }).promise();

  const users: string[] = data.Attributes ? data.Attributes.users : [];
  const count: number = users.length;
  const userString = users.map((user): string => `<@${user}>`).join(', ');
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
  app.client.oauth.access({
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
