const { Sequelize } = await import('sequelize-typescript');

const sequelize = new Sequelize({
  database: 'lisa',
  username: 'zero',
  password: 'zeroPass',
  host: 'localhost',
  port: 9302,
  logging: true,
  dialect: 'postgres',
});

const rand = {};

for (let i = 0; i < 1_000; i++) {
  const [results, metadata] = await sequelize.query('SELECT id from giveaway_user ORDER BY RANDOM() LIMIT 1');

  const id = results[0].id;
  if (!rand[id]) {
    rand[id] = 0;
  }
  rand[id]++;
}

console.log(rand);
