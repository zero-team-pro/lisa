import pMap from 'p-map';
import { got } from 'got';
import { Op } from 'sequelize';

import { Giveaway, GiveawayPrize, GiveawayUser } from '@/models';
import { DataOwner, TelegrafBot } from '@/types';
import { MessageBuilderMdast } from '@/controllers/messageBuilderMdast';
import { S3Cloud } from '@/controllers/s3';

const methodName = 'giveawaySend-cron';

async function downloadFile(url: string) {
  try {
    const response = await got(url, { responseType: 'buffer' });
    return response.body;
  } catch (err) {
    console.error('Error downloading the file for giveaway:', url, err.message);
    return null;
  }
}

async function sendPrize(bot: TelegrafBot, prize: GiveawayPrize) {
  const user = await GiveawayUser.findByPk(prize.winnerId, { include: Giveaway });

  if (user.userType !== DataOwner.telegramUser && user.userType !== DataOwner.telegramChat) {
    return;
  }

  const builder = new MessageBuilderMdast(null);

  builder.addLineRaw([builder.bold('Congratulations!')]);
  builder.addLineRaw([
    builder.text('You have won the giveaway '),
    builder.bold(user.giveaway.title),
    builder.text('!'),
  ]);
  builder.addEmptyLine();
  builder.addLineRaw([builder.text('The prize '), builder.bold(prize.title), builder.text(' will be sent bellow.')]);
  builder.addEmptyLine();
  builder.addLine(
    "If you don't receive the prize or if something went wrong, please contact us using the /support command (TODO 🙃).",
  );

  await bot.telegram.sendMessage(user.userId, builder.result(), { parse_mode: 'MarkdownV2' });

  if (prize.prizeType === 'TEXT') {
    await bot.telegram.sendMessage(user.userId, prize.prize);
  }

  if (prize.prizeType === 'S3') {
    const fileUrl = `${S3Cloud.PUBLIC_URL}/${S3Cloud.Dir.GiveawayPrize}/${prize.prize}`;
    const file = await downloadFile(fileUrl);
    if (file) {
      await bot.telegram.sendDocument(user.userId, { filename: prize.prize, source: file });
    } else {
      console.log('Cannot get file for prize', prize.id);
      await bot.telegram.sendMessage(user.userId, fileUrl);
    }
  }

  await prize.update({ status: 'SENT' });

  const giveawayPrizesNotSentCount = await GiveawayPrize.count({
    where: { giveawayId: prize.giveawayId, [Op.not]: [{ status: 'SENT' }] },
  });
  if (giveawayPrizesNotSentCount === 0) {
    await Giveaway.update({ status: 'FINISHED' }, { where: { id: prize.giveawayId } });
  }
}

const exec = async (bot: TelegrafBot) => {
  const prizes = await GiveawayPrize.findAll({
    where: { status: 'AWAITING' },
    order: ['id'],
  });

  await pMap(prizes, async (prize) => {
    try {
      await sendPrize(bot, prize);
    } catch (err) {
      console.log(`Cannot send prize ${prize.id}:`, err);
      await prize.update({ status: 'ERROR' });
    }
  });
};

export const giveawaySendCron = { methodName, exec };
