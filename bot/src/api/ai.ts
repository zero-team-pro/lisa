import express from 'express';

import { catchAsync } from '@/utils';
import { DataOwner } from '@/types';
import { AIOwner, PaymentTransaction, TelegramUser } from '@/models';

const router = express.Router();

router.get(
  '/balance',
  catchAsync(async (_req, res) => {
    const { adminUser } = res.locals;

    const telegramUserList = await TelegramUser.findAll({
      where: { adminId: adminUser.id },
    });
    const aiOwnerList = await AIOwner.findAll({
      where: {
        ownerType: DataOwner.telegramUser,
        owner: telegramUserList.map((user) => user.id),
      },
    });

    const list = [
      ...aiOwnerList.map((owner) => ({
        id: owner.id,
        owner: owner.owner,
        ownerType: owner.ownerType,
        balance: owner.balance,
        createdAt: owner.createdAt,
        updatedAt: owner.updatedAt,
      })),
    ];

    res.send(list);
  }),
);

router.get(
  '/transactions/:owner',
  catchAsync(async (req, res) => {
    const { adminUser } = res.locals;
    const { owner } = req.params;
    const [ownerType, ownerId] = owner?.split('-');

    const telegramUserList = await TelegramUser.findAll({
      where: { adminId: adminUser.id },
    });

    // TODO: Check is same admin

    // TODO: Limit data
    const transactions = await PaymentTransaction.findAll({ where: { ownerType, owner: ownerId } });

    res.send(transactions);
  }),
);

export default router;
