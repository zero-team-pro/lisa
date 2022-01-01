const Config = {
  API_URL: `${process.env.REACT_APP_API_HOST_LE ? 'https' : 'http'}://${process.env.REACT_APP_API_HOST}`,
};

export default Config;
