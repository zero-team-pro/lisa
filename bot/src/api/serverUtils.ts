interface UserCounter {
  count(options: { where: { serverId: string } }): Promise<number>;
}

export const countServerUsers = (userModel: UserCounter, guildId: string) =>
  userModel.count({ where: { serverId: guildId } });
