import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import Cookies from 'universal-cookie';

import { ReduxStateWrapper } from 'App/types';

interface IDiscordUser {
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
  isLoading: false,
  error: null,
} as ReduxStateWrapper<IDiscordUser>;

type IState = typeof initialState;

export const fetchUser = createAsyncThunk('discordUser/fetchUser', async (_, { rejectWithValue }) => {
  const cookies = new Cookies();
  const discordToken = cookies.get('discordToken');

  const payload = await fetch('https://discord.com/api/v8/oauth2/@me', {
    method: 'GET',
    headers: {
      Authorization: `Bearer ${discordToken}`,
    },
  });

  if (payload.status === 401) {
    cookies.remove('discordToken');
    return rejectWithValue(401);
  }

  const data = await payload.json();

  if (!data || typeof data.message !== 'undefined' || typeof data.code !== 'undefined' || !data.user) {
    return rejectWithValue(true);
  }
  return data.user;
});

export const discordUserSlice = createSlice({
  name: 'discordUser',
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

export const { logout } = discordUserSlice.actions;

export default discordUserSlice.reducer;
