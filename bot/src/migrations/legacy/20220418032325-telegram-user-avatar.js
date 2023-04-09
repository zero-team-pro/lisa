'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('telegram_user', 'avatarUrl');

    await queryInterface.addColumn('telegram_user', 'avatarUrlSmall', Sequelize.STRING);
    await queryInterface.addColumn('telegram_user', 'avatarUrlBig', Sequelize.STRING);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('telegram_user', 'avatarUrlSmall');
    await queryInterface.removeColumn('telegram_user', 'avatarUrlBig');

    await queryInterface.addColumn('telegram_user', 'avatarUrl', Sequelize.STRING);
  },
};
