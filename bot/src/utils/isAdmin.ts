import { Message, PermissionsBitField } from 'discord.js';

import { DiscordUser } from '../models';

export const isAdmin = (discordUser: DiscordUser, message?: Message) => {
  return discordUser.isAdmin || message?.member.permissions.has(PermissionsBitField.Flags.Administrator);
};
