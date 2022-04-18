import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Cookies from 'universal-cookie';

import Config from 'App/constants/config';
import { IAdmin, ReduxStateWrapper } from 'App/types';

interface IDiscordMeUser {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
  public_flags: number;
}

interface IAdminMe {
  discordUser?: IDiscordMeUser;
  admin: IAdmin;
}

// interface DiscordAuth {
//   application: {
//     id: string;
//     name: string;
//     icon: string;
//     description: string;
//     summary: string;
//     hook: boolean;
//     bot_public: boolean;
//     bot_require_code_grant: boolean;
//     verify_key: string;
//   };
//   scopes: string[];
//   expires: string;
//   user: IDiscordMeUser;
// }

const initialState = {
  value: null,
  isLoading: false,
  error: null,
} as ReduxStateWrapper<IAdminMe>;

type IState = typeof initialState;

export const fetchUser = createAsyncThunk('adminMe/fetchUser', async (_, { rejectWithValue }) => {
  const cookies = new Cookies();
  const discordToken = cookies.get('discordToken');

  const payload = await fetch(`${Config.API_URL}/auth/admin-me`, {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${discordToken}`,
    },
  }).catch((err) => {
    console.log(err);
    return null;
  });

  if (!payload) {
    return rejectWithValue('fetch');
  }

  if (payload.status !== 200) {
    if (payload.status === 401) {
      cookies.remove('discordToken');
    }
    return rejectWithValue(payload.status);
  }

  const data = await payload.json();

  if (!data || typeof data.message !== 'undefined' || typeof data.code !== 'undefined' || !data.admin) {
    return rejectWithValue(true);
  }
  return data;
});

export const adminMeSlice = createSlice({
  name: 'adminMe',
  initialState,
  reducers: {
    logout: (state) => {
      const cookies = new Cookies();
      cookies.remove('discordToken');
      state.value = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUser.pending, (state: IState) => {
      state.isLoading = true;
    });
    builder.addCase(fetchUser.fulfilled, (state: IState, action: any) => {
      state.value = action.payload;
      state.isLoading = false;
      state.error = null;
    });
    builder.addCase(fetchUser.rejected, (state: IState, action: any) => {
      state.value = null;
      state.isLoading = false;
      state.error = action.payload;
    });
  },
});
