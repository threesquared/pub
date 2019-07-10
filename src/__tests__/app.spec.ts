import AWS from 'aws-sdk';
import AWSMock from 'aws-sdk-mock';
import sinon from 'sinon';
import { start, yes, no, end } from '../app';

AWSMock.setSDKInstance(AWS);

afterEach(() => {
  AWSMock.restore();
});

describe('Start round', () => {
  test('Can start a round', async () => {
    const spy = sinon.stub().resolves({
      Body: 'test',
    });

    AWSMock.mock('DynamoDB.DocumentClient', 'put', spy);

    expect.assertions(2);

    const response = await start('channelId', 'userId');

    expect(response.response_type).toEqual('in_channel');
    expect(spy.callCount).toBe(1);
  });

  test('Will not start a round if one exists already', async () => {
    const spy = sinon.stub().throws('name');

    AWSMock.mock('DynamoDB.DocumentClient', 'put', spy);

    expect.assertions(2);

    const response = await start('channelId', 'userId');

    expect(response.text).toEqual('There is a pub vote in this channel already');
    expect(spy.callCount).toBe(1);
  });
});

describe('Yes vote', () => {
  test('Can record a valid yes vote', async () => {
    const getSpy = sinon.stub().resolves({
      Item: {
        users: [],
      },
    });

    const updateSpy = sinon.stub().resolves(true);

    AWSMock.mock('DynamoDB.DocumentClient', 'get', getSpy);
    AWSMock.mock('DynamoDB.DocumentClient', 'update', updateSpy);

    expect.assertions(3);

    const response = await yes('channelId', 'userId', 'userName');

    expect(response.text).toEqual('Yass userName!');
    expect(getSpy.callCount).toBe(1);
    expect(updateSpy.callCount).toBe(1);
  });

  test('Will not let a user vote yes twice', async () => {
    const spy = sinon.stub().resolves({
      Item: {
        users: ['userId'],
      },
    });

    AWSMock.mock('DynamoDB.DocumentClient', 'get', spy);

    expect.assertions(2);

    const response = await yes('channelId', 'userId', 'userName');

    expect(response.text).toEqual('You have already voted');
    expect(spy.callCount).toBe(1);
  });
});

describe('No vote', () => {
  test('Can record a valid no vote', async () => {
    const getSpy = sinon.stub().resolves({
      Item: {
        users: ['userId'],
      },
    });

    const updateSpy = sinon.stub().resolves(true);

    AWSMock.mock('DynamoDB.DocumentClient', 'get', getSpy);
    AWSMock.mock('DynamoDB.DocumentClient', 'update', updateSpy);

    expect.assertions(3);

    const response = await no('channelId', 'userId');

    expect(response.text).toEqual('Well you suck');
    expect(getSpy.callCount).toBe(1);
    expect(updateSpy.callCount).toBe(1);
  });
});

describe('End round', () => {
  test('Can end a round with enough people', async () => {
    const spy = sinon.stub().resolves({
      Attributes: {
        users: ['userId', 'userId2', 'userId3'],
      },
    });

    AWSMock.mock('DynamoDB.DocumentClient', 'delete', spy);

    expect.assertions(2);

    const response = await end('channelId', 'userId');

    expect(response.text).toEqual('Round ended with 3 people on it: <@userId>, <@userId2>, <@userId3> Assemble!');
    expect(spy.callCount).toBe(1);
  });

  test('Can end a round without enough people', async () => {
    const spy = sinon.stub().resolves({
      Attributes: {
        users: ['userId'],
      },
    });

    AWSMock.mock('DynamoDB.DocumentClient', 'delete', spy);

    expect.assertions(2);

    const response = await end('channelId', 'userId');

    expect(response.text).toEqual('Not enough people are on it, try harder next time');
    expect(spy.callCount).toBe(1);
  });

  test('Will not let another user end the round', async () => {
    const spy = sinon.stub().throws('name');

    AWSMock.mock('DynamoDB.DocumentClient', 'delete', spy);

    expect.assertions(2);

    const response = await end('channelId', 'otherUserId');

    expect(response.text).toEqual('You did not start this round');
    expect(spy.callCount).toBe(1);
  });
});
