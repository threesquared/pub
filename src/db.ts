import { DynamoDB, AWSError } from 'aws-sdk';
import { PutItemOutput, GetItemOutput, UpdateItemOutput, DeleteItemOutput } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';

const table = process.env.DYNAMODB_TABLE as string;
const getClient = (): DynamoDB.DocumentClient => new DynamoDB.DocumentClient();

/**
 * Create a new round item in the database.
 *
 * @param channelId
 * @param userId
 * @param ttl
 */
export const createRound = (channelId: string, userId: string, ttl: number): Promise<PromiseResult<PutItemOutput, AWSError>> => getClient().put({
  TableName: table,
  Item: {
    channelId,
    userId,
    ttl,
    votes: [],
  },
  ConditionExpression: 'attribute_not_exists(channelId)',
}).promise();

/**
 * Get the current round data.
 *
 * @param channelId
 */
export const getRoundData = (channelId: string): Promise<PromiseResult<GetItemOutput, AWSError>> => getClient().get({
  TableName: table,
  Key: {
    channelId,
  },
}).promise();

/**
 * Add a vote to a round.
 *
 * @param channelId
 * @param userId
 */
export const addVoteToRound = (channelId: string, userId: string): Promise<PromiseResult<UpdateItemOutput, AWSError>> => getClient().update({
  TableName: table,
  Key: {
    channelId,
  },
  UpdateExpression: 'SET #votes = list_append(#votes, :value)',
  ExpressionAttributeNames: {
    '#votes': 'votes',
  },
  ExpressionAttributeValues: {
    ':value': [
      userId,
    ],
  },
  ReturnValues: 'ALL_NEW',
}).promise();

/**
 * Remove a vote from a round
 *
 * @param channelId
 * @param userId
 */
export const removeVoteFromRound = async (channelId: string, userId: string): Promise<PromiseResult<UpdateItemOutput, AWSError>> => {
  const data = await getRoundData(channelId);

  const votes: string[] = data.Item ? data.Item.votes as string[] : [];
  const filteredVotes = votes.filter((user): boolean => user !== userId);

  return getClient().update({
    TableName: table,
    Key: {
      channelId,
    },
    UpdateExpression: 'SET #votes = :value',
    ExpressionAttributeNames: {
      '#votes': 'votes',
    },
    ExpressionAttributeValues: {
      ':value': filteredVotes,
    },
  }).promise();
};

/**
 * Delete a round.
 *
 * @param channelId
 * @param userId
 */
export const deleteRound = (channelId: string, userId: string): Promise<PromiseResult<DeleteItemOutput, AWSError>> => getClient().delete({
  TableName: table,
  Key: {
    channelId,
  },
  ConditionExpression: '#userId = :userId',
  ExpressionAttributeNames: {
    '#userId': 'userId',
  },
  ExpressionAttributeValues: {
    ':userId': userId,
  },
  ReturnValues: 'ALL_OLD',
}).promise();
