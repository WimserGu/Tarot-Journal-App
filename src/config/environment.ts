export type DataAdapterKind = 'local' | 'supabase';

export type SupabaseEnvironment = {
  publishableKey: string;
  url: string;
};

export type AppEnvironment = {
  dataAdapter: DataAdapterKind;
  supabase: SupabaseEnvironment | null;
};

export class EnvironmentConfigurationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'EnvironmentConfigurationError';
  }
}

export type EnvironmentSource = Readonly<Record<string, string | undefined>>;

function optionalValue(source: EnvironmentSource, key: string): string | undefined {
  const value = source[key]?.trim();

  return value && value.length > 0 ? value : undefined;
}

function validateSupabaseUrl(value: string): string {
  try {
    const url = new URL(value);

    if (url.protocol !== 'https:') {
      throw new EnvironmentConfigurationError('EXPO_PUBLIC_SUPABASE_URL 必须使用 https。');
    }

    return url.toString().replace(/\/$/, '');
  } catch (error) {
    if (error instanceof EnvironmentConfigurationError) {
      throw error;
    }

    throw new EnvironmentConfigurationError('EXPO_PUBLIC_SUPABASE_URL 不是有效 URL。');
  }
}

export function getAppEnvironment(
  source: EnvironmentSource = process.env as EnvironmentSource,
): AppEnvironment {
  const adapter = optionalValue(source, 'EXPO_PUBLIC_DATA_ADAPTER') ?? 'local';

  if (adapter !== 'local' && adapter !== 'supabase') {
    throw new EnvironmentConfigurationError('EXPO_PUBLIC_DATA_ADAPTER 必须是 local 或 supabase。');
  }

  if (adapter === 'local') {
    return { dataAdapter: 'local', supabase: null };
  }

  const url = optionalValue(source, 'EXPO_PUBLIC_SUPABASE_URL');
  const publishableKey = optionalValue(source, 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');

  if (!url || !publishableKey) {
    throw new EnvironmentConfigurationError(
      '使用 supabase adapter 时必须设置 EXPO_PUBLIC_SUPABASE_URL 和 EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY。',
    );
  }

  return {
    dataAdapter: 'supabase',
    supabase: { url: validateSupabaseUrl(url), publishableKey },
  };
}

export function getSupabaseEnvironment(source?: EnvironmentSource): SupabaseEnvironment {
  const environment = getAppEnvironment(source);

  if (!environment.supabase) {
    throw new EnvironmentConfigurationError(
      '当前 data adapter 是 local，Supabase client 尚未启用。',
    );
  }

  return environment.supabase;
}
