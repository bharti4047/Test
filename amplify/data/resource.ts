import { type ClientSchema, a, defineData } from '@aws-amplify/backend';

const schema = a.schema({
  Note: a
    .model({
      name: a.string(),
      description: a.string(),
      image: a.string(),
      status: a.enum(['active', 'inactive']),
      createdAt: a.datetime()
    })
    .secondaryIndexes(index => [
      index('createdAt').name('notesByCreatedAt')
    ])
    .authorization(allow => [allow.owner(), allow.authenticated().to(['read'])])
});

export type Schema = ClientSchema<typeof schema>;

export const data = defineData({
  schema,
  authorizationModes: {
    defaultAuthorizationMode: 'userPool'
  }
});