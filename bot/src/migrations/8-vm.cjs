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
      await queryInterface.createTable('vm', {
        id: {
          type: Sequelize.STRING,
          allowNull: false,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        token: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        externalIp: {
          type: Sequelize.STRING,
          allowNull: true,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('now'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('now'),
        },
      });

      await queryInterface.addIndex('vm', ['name'], { transaction: t });
      await queryInterface.addIndex('vm', ['token'], { transaction: t });
      await queryInterface.addIndex('vm', ['externalIp'], { transaction: t });
    });
  },

  /**
   *
   * @param {Sequelize.QueryInterface} queryInterface
   * @param {Sequelize} Sequelize
   */
  async down(queryInterface, Sequelize) {
    return queryInterface.sequelize.transaction((t) => {
      return Promise.all([queryInterface.dropTable('vm', { transaction: t })]);
    });
  },
};
