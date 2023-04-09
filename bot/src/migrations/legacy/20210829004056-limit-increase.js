'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      'UPDATE "user" SET "raterLimit" = "user"."raterLimit" * 10;',
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(
      'UPDATE "user" SET "raterLimit" = "user"."raterLimit" / 10;',
    );
  },
};
