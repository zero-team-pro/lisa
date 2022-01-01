import { Message } from 'discord.js';

import { User } from '../models';

export const isAdmin = (user: User, message?: Message) => {
  return user.isAdmin || message?.member.permissions.has('ADMINISTRATOR');
};
