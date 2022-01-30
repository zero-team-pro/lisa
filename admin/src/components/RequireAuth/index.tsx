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

  const token = cookies.get('token');
  const userStore = useAppSelector((state) => state.discordUser);

  const isRedirectToLogin = !token || (!userStore.isLoading && !!userStore.error);

  useEffect(() => {
    if (isRedirectToLogin) {
      navigate('/login', { replace: true });
    }
  });

  return isRedirectToLogin || userStore.isLoading ? null : props.children;
}

export default RequireAuth;
