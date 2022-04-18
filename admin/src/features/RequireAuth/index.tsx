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
  const adminMe = useAppSelector((state) => state.adminMe);

  const isRedirectToLogin = !discordToken || (!adminMe.isLoading && !!adminMe.error);

  useEffect(() => {
    if (isRedirectToLogin) {
      navigate('/login', { replace: true });
    }
  });

  const shouldDisplay = !isRedirectToLogin && !adminMe.isLoading && !!adminMe.value;

  return shouldDisplay ? props.children : null;
}

export default RequireAuth;
