import React, { useEffect } from 'react';
import { useNavigate } from 'react-router';

import { useAppSelector } from 'App/redux';
import Cookies from 'universal-cookie';

interface IProps {
  children: React.ReactElement;
}

function RequireAuth(props: IProps) {
  const navigate = useNavigate();
  const cookies = new Cookies();

  const discordToken = cookies.get('discordToken');
  const userStore = useAppSelector((state) => state.discordUser);

  const isRedirectToLogin = !discordToken || (!userStore.isLoading && !!userStore.error);

  useEffect(() => {
    if (isRedirectToLogin) {
      navigate('/login', { replace: true });
    }
  });

  const shouldDisplay = !isRedirectToLogin && !userStore.isLoading && !!userStore.value;

  return shouldDisplay ? props.children : null;
}

export default RequireAuth;
