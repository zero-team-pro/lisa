import _ from 'lodash';
import { Op } from 'sequelize';

import { RaterCost } from '../constants';
import { RaterCall } from '../models';

// TODO: Limits by Discord ID
const getRaterLimit = async (userId: number, gte: Date, lt?: Date) => {
  const callsCostList = await Promise.all(
    Object.keys(RaterCost).map((engine) => {
      return RaterCall.count({
        where: {
          userId,
          // TODO: Bug https://github.com/sequelize/sequelize/issues/13468
          time: _.omitBy(
            {
              [Op.gte]: gte,
              [Op.lt]: lt,
            },
            _.isUndefined,
          ),
          rater: engine,
        },
      }).then((calls) => calls * RaterCost[engine]);
    }),
  );

  return _.sum(callsCostList);
};

export const getRaterLimitToday = async (userId: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return getRaterLimit(userId, today);
};

export const getRaterLimitYesterday = async (userId: number) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  return getRaterLimit(userId, yesterday, today);
};

const getRaterCalls = async (gte: Date, lt?: Date) => {
  return RaterCall.count({
    where: {
      // TODO: Bug https://github.com/sequelize/sequelize/issues/13468
      time: _.omitBy(
        {
          [Op.gte]: gte,
          [Op.lt]: lt,
        },
        _.isUndefined,
      ),
    },
  });
};

export const getRaterCallsToday = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return getRaterCalls(today);
};

export const getRaterCallsYesterday = async () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);

  return getRaterCalls(yesterday, today);
};
