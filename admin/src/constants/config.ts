const API_URL = `${process.env.REACT_APP_API_HOST_LE ? 'https' : 'http'}://${process.env.REACT_APP_API_HOST}`;

const Config = {
  API_URL,
  DISCORD_API_URL: '',
  AVATAR_CDN: 'https://cdn.discordapp.com/avatars/',
  STATIC_PATH: `${API_URL}/static`,
};

export default Config;
