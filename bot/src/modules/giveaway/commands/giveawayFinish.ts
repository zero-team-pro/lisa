import pMap from 'p-map';

import { BaseMessage } from '@/controllers/baseMessage';
import { BotError } from '@/controllers/botError';
import { MessageBuilder } from '@/controllers/messageBuilder';
import { Giveaway, GiveawayPrize, GiveawayUser, sequelize } from '@/models';
import { OwnerType, Transport } from '@/types';

const methodName = 'giveawayFinish';

const usageError = async (builder: MessageBuilder) => {
  builder.addFieldCode('Usage', '/giveawayFinish [id]');
  builder.addFieldCode('Example', '/giveawayFinish 1234567890');
  return builder.reply();
};

async function updateRandomGiveawayUsers(giveawayId: number) {
  return await sequelize.transaction(async (t) => {
    const giveawayUserCount = await GiveawayUser.count({
      where: { giveawayId },
      transaction: t,
    });

    const giveawayPrizeList = await GiveawayPrize.findAll({
      where: { giveawayId },
      order: ['id'],
      transaction: t,
    });

    if (giveawayPrizeList.length > giveawayUserCount) {
      throw new BotError('Error. There are more prizes than users.');
    }

    if (giveawayPrizeList.some((prize) => prize.status !== 'CREATED' || Boolean(prize.winnerId))) {
      throw new BotError('Error. Some prizes have already been processed or are currently being processed.');
    }

    const winners = await sequelize.query(
      `SELECT * from giveaway_user WHERE "giveawayId" = ${giveawayId} ORDER BY RANDOM() LIMIT ${giveawayPrizeList.length}`,
      {
        model: GiveawayUser,
        mapToModel: true,
        plain: false,
        transaction: t,
      },
    );

    const results = await pMap(
      giveawayPrizeList,
      async (prize, index) => {
        const winner = winners[index];
        await prize.update({ status: 'AWAITING', winnerId: winner.id }, { transaction: t });
        return {
          prize: { id: prize.id, title: prize.title },
          winner: { userId: winner.userId, userType: winner.userType },
        };
      },
      { concurrency: 1 },
    );

    return results;
  });
}

const exec = async (message: BaseMessage) => {
  const [, giveawayIdStr] = message.content.split(' ');
  const giveawayId = Number.parseInt(giveawayIdStr, 10);

  let userType: OwnerType | null = null;
  if (message.transport === Transport.Discord) {
    userType = 'discordUser';
  }
  if (message.transport === Transport.Telegram) {
    userType = 'telegramUser';
  }

  if (!userType) {
    throw new BotError('Unsupported messanger.');
  }

  const builderOld = message.getMessageBuilderOld();

  if (typeof giveawayId !== 'number' || isNaN(giveawayId)) {
    return usageError(builderOld);
  }

  const giveaway = await Giveaway.findOne({ where: { id: giveawayId } });

  if (!giveaway) {
    return message.reply('Cannot find a giveaway with this ID.');
  }

  if (giveaway.ownerId !== message.fromId || giveaway.ownerType !== userType) {
    return message.reply('You are not the owner of this giveaway.');
  }

  if (giveaway.status === 'PROCESSING') {
    return message.reply('The giveaway is already processing.');
  }

  if (giveaway.status === 'FINISHED') {
    return message.reply('The giveaway has already finished.');
  }

  const results = await updateRandomGiveawayUsers(giveawayId);

  await giveaway.update({ status: 'PROCESSING' });

  const builder = message.getMessageBuilder();

  builder.addLineRaw([
    builder.text('You have successfully finished the giveaway '),
    builder.bold(giveaway.title),
    builder.text('.'),
  ]);
  builder.addLine('Winners:');
  builder.addEmptyLine();

  await pMap(
    results,
    async (result) => {
      const user = await message.getUserMentionById(result.winner.userId);
      builder.addField(user, result.prize.title, ' - ');
    },
    { concurrency: 1 },
  );

  return builder.reply();
};

export const giveawayFinish = { methodName, exec };
