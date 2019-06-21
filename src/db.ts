import { DynamoDB, AWSError } from 'aws-sdk'
import { PutItemOutput, GetItemOutput, UpdateItemOutput, DeleteItemOutput } from 'aws-sdk/clients/dynamodb';
import { PromiseResult } from 'aws-sdk/lib/request';

const table = process.env.DYNAMODB_TABLE as string;
const dynamo = new DynamoDB.DocumentClient();

export const startRound = (id: string): Promise<PromiseResult<PutItemOutput, AWSError>> => dynamo.put({
  TableName: table,
  Item: {
    id,
    users: []
  },
  ConditionExpression: "attribute_not_exists(id)"
}).promise()

export const getRoundData = (id: string): Promise<PromiseResult<GetItemOutput, AWSError>> => dynamo.get({
  TableName: table,
  Key: {
    id
  },
}).promise()

export const addVote = (id: string, userId: string): Promise<PromiseResult<UpdateItemOutput, AWSError>> => dynamo.update({
  TableName: table,
  Key: {
    id
  },
  UpdateExpression: 'SET #users = list_append(#users, :value)',
  ExpressionAttributeNames: {
    '#users': 'users',
  },
  ExpressionAttributeValues: {
    ':value': [
      userId
    ],
  },
  ReturnValues: 'ALL_NEW',
}).promise()

export const removeVote = async (id: string, userId: string): Promise<PromiseResult<UpdateItemOutput, AWSError>> => {
  const data = await getRoundData(id);

  const users: string[] = data.Item ? data.Item.users as string[] : [];
  const filteredUsers = users.filter((user): boolean => user !== userId);

  return await dynamo.update({
    TableName: table,
    Key: {
      id
    },
    UpdateExpression: 'SET #users = :value',
    ExpressionAttributeNames: {
      '#users': 'users',
    },
    ExpressionAttributeValues: {
      ':value': filteredUsers,
    }
  }).promise()
}

export const endRound = (id: string): Promise<PromiseResult<DeleteItemOutput, AWSError>> => dynamo.delete({
  TableName: table,
  Key: {
    id
  },
  ReturnValues: 'ALL_OLD'
}).promise()
