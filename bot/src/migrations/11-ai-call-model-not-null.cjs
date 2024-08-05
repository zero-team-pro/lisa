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
      await queryInterface.changeColumn(
        'ai_call',
        'model',
        {
          type: Sequelize.DataTypes.STRING,
          allowNull: false,
        },
        { transaction: t },
      );
    });
  },

  /**
   *
   * @param {Sequelize.QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.changeColumn(
        'ai_call',
        'model',
        {
          type: Sequelize.DataTypes.STRING,
          allowNull: true,
          defaultValue: null,
        },
        { transaction: t },
      );
    });
  },
};
