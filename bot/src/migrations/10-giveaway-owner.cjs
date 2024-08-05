'use strict';

var Sequelize = require('sequelize');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  /**
   *
   * @param {Sequelize.QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  async up(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn(
        'giveaway',
        'ownerId',
        {
          type: Sequelize.DataTypes.STRING,
          allowNull: false,
          defaultValue: '0',
        },
        { transaction: t },
      );
      await queryInterface.changeColumn(
        'giveaway',
        'ownerId',
        {
          type: Sequelize.DataTypes.STRING,
          allowNull: false,
        },
        { transaction: t },
      );

      await queryInterface.addColumn(
        'giveaway',
        'ownerType',
        {
          type: Sequelize.DataTypes.STRING,
          allowNull: false,
          defaultValue: 'telegramUser',
        },
        { transaction: t },
      );
      await queryInterface.changeColumn(
        'giveaway',
        'ownerType',
        {
          type: Sequelize.DataTypes.STRING,
          allowNull: false,
        },
        { transaction: t },
      );

      await queryInterface.addIndex('giveaway', ['ownerId'], { transaction: t });
      await queryInterface.addIndex('giveaway', ['ownerType'], { transaction: t });
    });
  },

  /**
   *
   * @param {Sequelize.QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeIndex('giveaway', ['ownerId'], { transaction: t });
      await queryInterface.removeIndex('giveaway', ['ownerType'], { transaction: t });

      await queryInterface.removeColumn('giveaway', 'ownerId', { transaction: t });
      await queryInterface.removeColumn('giveaway', 'ownerType', { transaction: t });
    });
  },
};
