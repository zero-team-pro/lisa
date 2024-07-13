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
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all([
        queryInterface.addColumn(
          'ai_call',
          'model',
          {
            type: Sequelize.DataTypes.STRING,
            allowNull: true,
            defaultValue: null,
          },
          { transaction: t },
        ),

        queryInterface.addColumn(
          'ai_call',
          'toolsTokens',
          {
            type: Sequelize.DataTypes.STRING,
            allowNull: false,
            defaultValue: 0,
          },
          { transaction: t },
        ),

        queryInterface.removeColumn('ai_call', 'updatedAt', { transaction: t }),
      ]);
    });
  },

  /**
   *
   * @param {Sequelize.QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all([
        queryInterface.removeColumn('ai_call', 'model', { transaction: t }),
        queryInterface.removeColumn('ai_call', 'toolsTokens', { transaction: t }),

        queryInterface.addColumn(
          'ai_call',
          'updatedAt',
          {
            type: Sequelize.DataTypes.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('NOW()'),
          },
          { transaction: t },
        ),
        // queryInterface.bulkUpdate('ai_call', { updatedAt: new Date() }, {}, { transaction: t }),
        queryInterface.changeColumn(
          'ai_call',
          'updatedAt',
          { type: Sequelize.DATE, allowNull: false },
          { transaction: t },
        ),
      ]);
    });
  },
};
