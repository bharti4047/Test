import { defineStorage } from '@aws-amplify/backend';

export const storage = defineStorage({
  name: 'notesDriveBucket',
  access: (allow) => ({
    'media/{entity_id}/*': [
      allow.entity('identity').to(['read', 'write', 'delete']),
      allow.authenticated.to(['read', 'write', 'delete']),
    ],
  }),
});
