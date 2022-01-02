const Config = {
  API_URL: `${process.env.REACT_APP_API_HOST_LE ? 'https' : 'http'}://${process.env.REACT_APP_API_HOST}`,
  DISCORD_API_URL: '',
  AVATAR_CDN: 'https://cdn.discordapp.com/avatars/'
};

export default Config;
