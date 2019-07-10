import { RespondArguments } from '@slack/bolt';
import { startRound, getRoundData, addVote, removeVote, endRound } from './db';

/**
 * Start a new round.
 *
 * @param channelId
 * @param userId
 */
export async function start(channelId: string, userId: string): Promise<RespondArguments> {
  try {
    await startRound(channelId, userId);
  } catch (error) {
    return {
      response_type: 'ephemeral',
      text: 'There is a pub vote in this channel already',
    };
  }

  console.log(`Starting pub round in ${channelId}`);

  return {
    response_type: 'in_channel',
    text: '',
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: 'Soooooooo, Pub? :beers:',
        },
      },
      {
        type: 'actions',
        elements: [
          {
            type: 'button',
            action_id: 'yes_action',
            text: {
              type: 'plain_text',
              emoji: true,
              text: 'Yes',
            },
            value: channelId,
          },
          {
            type: 'button',
            action_id: 'no_action',
            text: {
              type: 'plain_text',
              emoji: true,
              text: 'No',
            },
            value: channelId,
          },
          {
            type: 'button',
            action_id: 'end_action',
            text: {
              type: 'plain_text',
              emoji: true,
              text: 'End Round',
            },
            value: channelId,
          },
        ],
      },
    ],
  };
}

/**
 * Record a yes response.
 *
 * @param channelId
 * @param userId
 * @param userName
 */
export async function yes(channelId: string, userId: string, userName: string): Promise<RespondArguments> {
  console.log(`Someones on it ${userId}`);

  const data = await getRoundData(channelId);
  const users: string[] = data.Item ? data.Item.users as string[] : [];

  if (users.includes(userId)) {
    return {
      response_type: 'ephemeral',
      replace_original: false,
      text: 'You have already voted',
    };
  }

  await addVote(channelId, userId);

  return {
    response_type: 'ephemeral',
    replace_original: false,
    text: `Yass ${userName}!`,
  };
}

/**
 * Record a no response.
 *
 * @param channelId
 * @param userId
 */
export async function no(channelId: string, userId: string): Promise<RespondArguments>  {
  console.log(`Someone is not ${userId}`);

  await removeVote(channelId, userId);

  return {
    response_type: 'ephemeral',
    replace_original: false,
    text: 'Well you suck',
  };
}

/**
 * Record an end round command.
 *
 * @param channelId
 * @param userId
 */
export async function end(channelId: string, userId: string): Promise<RespondArguments> {
  let data;

  try {
    data = await endRound(channelId, userId);
  } catch (error) {
    return {
      response_type: 'ephemeral',
      replace_original: false,
      text: 'You did not start this round',
    };
  }

  console.log(`Round ended by ${userId}`);

  const users: string[] = data.Attributes ? data.Attributes.users as string[] : [];
  const count: number = users.length;
  const userString: string = users.map((user): string => `<@${user}>`).join(', ');

  let text: string;

  if (count >= 3) {
    text = `Round ended with ${count} people on it: ${userString} Assemble!`;
  } else {
    text = 'Not enough people are on it, try harder next time';
  }

  return {
    response_type: 'in_channel',
    replace_original: false,
    delete_original: true,
    text,
  };
}
