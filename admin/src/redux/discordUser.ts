import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Cookies from 'universal-cookie';

import { ReduxStateWrapper } from 'App/redux/tpyes';

interface DiscordUser {
  id: string;
  username: string;
  avatar: string;
  discriminator: string;
  public_flags: number;
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
//   user: DiscordUser;
// }

const initialState = {
  value: null,
} as ReduxStateWrapper<DiscordUser>;

export const fetchUser = createAsyncThunk('discordUser/fetchUser', async () => {
  const cookies = new Cookies();
  const token = cookies.get('token');

  const payload = await fetch('https://discord.com/api/v8/oauth2/@me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  const data = await payload.json();

  if (!data || typeof data.message !== 'undefined' || typeof data.code !== 'undefined' || !data.user) {
    return;
  }
  return data.user;
});

export const discordUserSlice = createSlice({
  name: 'discordUser',
  initialState,
  reducers: {
    logout: (state) => {
      const cookies = new Cookies();
      cookies.remove('token');
      state.value = null;
    },
  },
  extraReducers: (builder) => {
    builder.addCase(fetchUser.fulfilled, (state: any, action: any) => {
      state.value = action.payload;
    });
  },
});

export const { logout } = discordUserSlice.actions;

export default discordUserSlice.reducer;
