import React, { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router';
import qs from 'query-string';
import Cookies from 'universal-cookie';

import { useAppDispatch } from 'App/redux';
import { fetchUser } from 'App/redux/discordUser';

function DiscordCallbackPage() {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const params = qs.parse(location.search);

    const cookies = new Cookies();
    cookies.set('token', params.token, { path: '/', maxAge: 604800 });
    dispatch(fetchUser())

    navigate('/', { replace: true });
  });

  return <div />;
}

export default DiscordCallbackPage;
