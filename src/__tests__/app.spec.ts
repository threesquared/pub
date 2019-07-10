import AWS from 'aws-sdk';
import AWSMock from 'aws-sdk-mock';
import { start, yes, no, end } from '../app';

AWSMock.setSDKInstance(AWS);

afterEach(() => {
  AWSMock.restore();
});

describe('Start round', () => {
  test('Can start a round', async () => {
    const putMock = jest.fn().mockReturnValue(Promise.resolve(true));
    AWSMock.mock('DynamoDB.DocumentClient', 'put', putMock);

    expect.assertions(2);

    const response = await start('channelId', 'userId');

    expect(response.response_type).toEqual('in_channel');
    expect(putMock).toBeCalled();
  });

  test('Will not start a round if one exists already', async () => {
    const putMock = jest.fn().mockRejectedValue(new Error('Fail'));
    AWSMock.mock('DynamoDB.DocumentClient', 'put', putMock);

    expect.assertions(2);

    const response = await start('channelId', 'userId');

    expect(response.text).toContain('in this channel already');
    expect(putMock).toBeCalled();
  });
});

describe('Yes vote', () => {
  test('Can record a valid yes vote', async () => {
    const getMock = jest.fn().mockReturnValue(Promise.resolve({
      Item: {
        votes: [],
      },
    }));

    const updateMock = jest.fn().mockReturnValue(Promise.resolve(true));

    AWSMock.mock('DynamoDB.DocumentClient', 'get', getMock);
    AWSMock.mock('DynamoDB.DocumentClient', 'update', updateMock);

    expect.assertions(3);

    const response = await yes('channelId', 'userId', 'userName');

    expect(response.text).toEqual('Yass userName!');
    expect(getMock).toBeCalled();
    expect(updateMock).toBeCalledWith(
      expect.objectContaining({
        ExpressionAttributeValues: {
          ':value': ['userId'],
        },
      }),
      expect.any(Function),
    );
  });

  test('Will not let a user vote yes twice', async () => {
    const getMock = jest.fn().mockReturnValue(Promise.resolve({
      Item: {
        votes: ['userId'],
      },
    }));

    AWSMock.mock('DynamoDB.DocumentClient', 'get', getMock);

    expect.assertions(2);

    const response = await yes('channelId', 'userId', 'userName');

    expect(response.text).toContain('already voted');
    expect(getMock).toBeCalled();
  });
});

describe('No vote', () => {
  test('Can record a valid no vote', async () => {
    const getMock = jest.fn().mockReturnValue(Promise.resolve({
      Item: {
        votes: ['userId', 'otherUser'],
      },
    }));

    const updateMock = jest.fn().mockReturnValue(Promise.resolve(true));

    AWSMock.mock('DynamoDB.DocumentClient', 'get', getMock);
    AWSMock.mock('DynamoDB.DocumentClient', 'update', updateMock);

    expect.assertions(3);

    const response = await no('channelId', 'userId');

    expect(response.text).toContain('you suck');
    expect(getMock).toBeCalled();
    expect(updateMock).toBeCalledWith(
      expect.objectContaining({
        ExpressionAttributeValues: {
          ':value': ['otherUser'],
        },
      }),
      expect.any(Function),
    );
  });
});

describe('End round', () => {
  test('Can end a round with enough people', async () => {
    const deleteMock = jest.fn().mockReturnValue(Promise.resolve({
      Attributes: {
        votes: ['userId', 'userId2', 'userId3'],
      },
    }));

    AWSMock.mock('DynamoDB.DocumentClient', 'delete', deleteMock);

    expect.assertions(2);

    const response = await end('channelId', 'userId');

    expect(response.text).toContain('3 people on it: <@userId>, <@userId2>, <@userId3>');
    expect(deleteMock).toBeCalled();
  });

  test('Can end a round with not enough people', async () => {
    const deleteMock = jest.fn().mockReturnValue(Promise.resolve({
      Attributes: {
        votes: ['userId'],
      },
    }));

    AWSMock.mock('DynamoDB.DocumentClient', 'delete', deleteMock);

    expect.assertions(2);

    const response = await end('channelId', 'userId');

    expect(response.text).toContain('Not enough people are on it');
    expect(deleteMock).toBeCalled();
  });

  test('Will not let another user end someone elses round', async () => {
    const deleteMock = jest.fn().mockRejectedValue(new Error('Fail'));

    AWSMock.mock('DynamoDB.DocumentClient', 'delete', deleteMock);

    expect.assertions(2);

    const response = await end('channelId', 'otherUserId');

    expect(response.text).toContain('did not start this round');
    expect(deleteMock).toBeCalled();
  });
});
