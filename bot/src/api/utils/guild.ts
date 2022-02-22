import { AdminUser, Server } from '../../models';
import { Bridge } from '../../controllers/bridge';

export const fetchGuild = async (bridge: Bridge, guildId: string, userDiscordId: string) => {
  const discordGuildParts = await bridge.requestGlobal({ method: 'guild', params: { guildId, userDiscordId } });
  return discordGuildParts.map((guildPart) => guildPart.result).filter((guild) => guild)[0];
};

export const fetchGuildAdminList = async (bridge: Bridge, guildId: string, adminUserList?: AdminUser[]) => {
  if (!adminUserList) {
    const server = await Server.findByPk(guildId, {
      include: [{ model: AdminUser, as: 'adminUserList', through: { attributes: [] } }],
    });
    adminUserList = server.adminUserList;
  }

  const discordIdList = adminUserList.map((admin) => admin.discordId);

  const guildAdminListParts = await bridge.requestGlobal({
    method: 'guildFetchUsers',
    params: { guildId, discordIdList },
  });

  const response = guildAdminListParts.map((guildPart) => guildPart.result).filter((guild) => guild)[0];

  return response?.adminUserList
    ? adminUserList.map((admin) => {
        const discordUser = response.adminUserList?.[admin.discordId];
        return {
          ...admin.toJSON(),
          ...discordUser,
        };
      })
    : adminUserList;
};
