export type NodeEnvironment = 'development' | 'test' | 'production';

export interface AppEnvironment {
  NODE_ENV: NodeEnvironment;
  DATABASE_URL: string;
  JWT_SECRET: string;
  JWT_EXPIRES_IN: string;
  PORT: number;
  CORS_ORIGINS: string;
}

function requiredString(
  config: Record<string, unknown>,
  key: keyof AppEnvironment,
): string {
  const value = config[key];

  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`A variável de ambiente ${key} é obrigatória.`);
  }

  return value.trim();
}

function optionalString(
  config: Record<string, unknown>,
  key: keyof AppEnvironment,
  defaultValue: string,
): string {
  const value = config[key];

  if (value === undefined) {
    return defaultValue;
  }

  if (typeof value !== 'string') {
    throw new Error(`A variável de ambiente ${key} deve ser uma string.`);
  }

  return value.trim() || defaultValue;
}

export function validateEnvironment(
  config: Record<string, unknown>,
): AppEnvironment {
  const databaseUrl = requiredString(config, 'DATABASE_URL');
  const jwtSecret = requiredString(config, 'JWT_SECRET');
  const port = Number(config.PORT ?? 3000);
  const nodeEnvironment = optionalString(config, 'NODE_ENV', 'development');
  const jwtExpiresIn = optionalString(config, 'JWT_EXPIRES_IN', '7d');
  const corsOrigins = optionalString(
    config,
    'CORS_ORIGINS',
    'http://localhost:8081,http://localhost:19006',
  );

  if (!databaseUrl.startsWith('postgresql://')) {
    throw new Error('DATABASE_URL deve utilizar o protocolo postgresql://.');
  }
  if (jwtSecret.length < 32) {
    throw new Error('JWT_SECRET deve possuir pelo menos 32 caracteres.');
  }
  if (!/^\d+(?:ms|s|m|h|d|w|y)?$/i.test(jwtExpiresIn)) {
    throw new Error('JWT_EXPIRES_IN deve ser um número ou duração como 7d.');
  }
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('PORT deve ser um número inteiro entre 1 e 65535.');
  }
  if (!['development', 'test', 'production'].includes(nodeEnvironment)) {
    throw new Error('NODE_ENV deve ser development, test ou production.');
  }
  if (corsOrigins.split(',').some((origin) => origin.trim() === '*')) {
    throw new Error('CORS_ORIGINS não pode conter wildcard (*).');
  }
  if (
    nodeEnvironment === 'production' &&
    [
      'change-me',
      'replace-with-a-long-random-secret',
      'local-development-secret-change-before-production',
    ].includes(jwtSecret)
  ) {
    throw new Error('JWT_SECRET de exemplo não pode ser usada em produção.');
  }
  if (
    nodeEnvironment === 'production' &&
    (typeof config.CORS_ORIGINS !== 'string' ||
      config.CORS_ORIGINS.trim() === '')
  ) {
    throw new Error(
      'CORS_ORIGINS deve ser definido explicitamente em produção.',
    );
  }

  return {
    NODE_ENV: nodeEnvironment as NodeEnvironment,
    DATABASE_URL: databaseUrl,
    JWT_SECRET: jwtSecret,
    JWT_EXPIRES_IN: jwtExpiresIn,
    PORT: port,
    CORS_ORIGINS: corsOrigins,
  };
}
