import 'react-native-url-polyfill/auto';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import {
  getSupabaseEnvironment,
  type EnvironmentSource,
  type SupabaseEnvironment,
} from '../config/environment';

export function createSupabaseClient(config: SupabaseEnvironment): SupabaseClient {
  return createClient(config.url, config.publishableKey, {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: AsyncStorage,
    },
  });
}

/** Creates a client only when EXPO_PUBLIC_DATA_ADAPTER=supabase is explicitly selected. */
export function getSupabaseClient(source?: EnvironmentSource): SupabaseClient {
  return createSupabaseClient(getSupabaseEnvironment(source));
}
