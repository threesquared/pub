import * as WebApi from 'seratch-slack-types/web-api';
import { Request, Response, Application } from 'express';
import { App, ExpressReceiver, ButtonAction, BlockAction, SlackActionMiddlewareArgs, LogLevel } from '@slack/bolt';
import { WebClient } from '@slack/web-api';
import { DynamoDB } from 'aws-sdk'
import uuid from 'uuid';

const expressReceiver = new ExpressReceiver({
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

export const expressApp: Application = expressReceiver.app;

const app: App = new App({
  token: process.env.SLACK_BOT_TOKEN,
  logLevel: LogLevel.DEBUG,
  receiver: expressReceiver
});

const dynamoDb = new DynamoDB.DocumentClient();

app.client = new WebClient(process.env.SLACK_API_TOKEN);

app.command('/pub', async ({ ack, respond }): Promise<void>  => {
  ack();

  const id = uuid.v1();

  console.log(`Starting pub round ${id}`);

  const data = await dynamoDb.put({
    TableName: process.env.DYNAMODB_TABLE,
    Item: {
      id: id,
      count: 0
    }
  });

  console.log(`done dynamo ${data}`);

  await respond({
    response_type: 'in_channel',
    text: '',
    blocks: [
      {
        "type": "section",
        "text": {
          "type": "mrkdwn",
          "text": `soooooooo, Pub?`
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
            "value": id
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
          }
        ]
      }
    ]
  });
});

app.action('yes_action', ({ body, action, ack, respond }: SlackActionMiddlewareArgs<BlockAction<ButtonAction>>): void => {
  ack();

  console.log(`Someones on it ${body.user.id}`);

  dynamoDb.update({
    TableName: process.env.DYNAMODB_TABLE,
    Key: {
      id: action.value
    },
    UpdateExpression: 'add #count :value',
    ExpressionAttributeNames: {
      '#count': 'count',
    },
    ExpressionAttributeValues: {
      ':value': 1,
    },
    ReturnValues: 'ALL_NEW',
  }, (err, data): void => {
    if (err) {
      console.log(err);
    } else {
      console.log(`done dynamo ${data}`);

      respond({
        response_type: 'ephemeral',
        text: `yass ${body.user.name}`,
      });
    }
  })
});

app.action('no_action', ({ body, ack, respond }): void => {
  ack();

  console.log(`Someone is not ${body.user.id}`);

  respond({
    response_type: 'ephemeral',
    text: 'you suck',
  });
});

app.error((error): void => {
  console.error(error);
});

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
    client_id: process.env.SLACK_CLIENT_ID,
    client_secret: process.env.SLACK_CLIENT_SECRET,
    redirect_uri: process.env.SLACK_REDIRECT_URI
  })
    .then((apiRes: WebApi.OauthAccessResponse): void => {
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
