'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.query(`CREATE TYPE "enum_server_modules" AS ENUM('core', 'rater');`);
    await queryInterface.sequelize.query(`
        ALTER TABLE "server"
            ADD COLUMN "modules" "enum_server_modules"[] NOT NULL DEFAULT  ARRAY ['core']::"enum_server_modules"[];`);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.sequelize.removeColumn('server', 'modules');
    await queryInterface.sequelize.query(`DROP TYPE "enum_server_modules";`);
  },
};
