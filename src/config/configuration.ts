import Joi from 'joi';

const secrets = Joi.string().min(32);

/**
 * Fail fast on invalid configuration. Secrets must be strong and explicitly
 * supplied; there are no insecure production defaults.
 */
export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string().valid('development', 'test', 'production').default('development'),
  PORT: Joi.number().integer().min(1).max(65535).default(3000),
  API_PREFIX: Joi.string()
    .pattern(/^[a-z0-9/-]+$/)
    .default('api/v1'),
  TRUST_PROXY: Joi.boolean().truthy('true').falsy('false').default(false),
  DOCS_ENABLED: Joi.boolean().truthy('true').falsy('false').default(true),
  CORS_ORIGINS: Joi.string().allow('').default('http://localhost:5173'),
  PUBLIC_BASE_URL: Joi.string()
    .uri({ scheme: ['http', 'https'] })
    .default('http://localhost:3000'),

  DATABASE_URL: Joi.string()
    .uri({ scheme: ['postgresql', 'postgres'] })
    .required(),

  JWT_ACCESS_SECRET: secrets.required(),
  JWT_ACCESS_TTL_SECONDS: Joi.number().integer().min(300).max(604800).default(43_200),
  QR_TOKEN_SECRET: secrets.required(),
  QR_TOKEN_TTL_SECONDS: Joi.number().integer().min(3600).max(31_536_000).default(31_536_000),
  VISUAL_TOKEN_SECRET: secrets.required(),
  ADMIN_API_KEY: Joi.string().min(24).required(),
  BCRYPT_ROUNDS: Joi.number().integer().min(10).max(15).default(12),
  LOGIN_MAX_ATTEMPTS: Joi.number().integer().min(3).max(10).default(5),
  LOGIN_LOCK_MINUTES: Joi.number().integer().min(1).max(120).default(15),

  TTS_URL_SIGNING_SECRET: secrets.required(),
  TTS_URL_TTL_SECONDS: Joi.number().integer().min(60).max(86_400).default(3600),

  THROTTLE_TTL_MS: Joi.number().integer().min(1000).default(60_000),
  THROTTLE_LIMIT: Joi.number().integer().min(10).max(10_000).default(300),

  OCR_PROVIDER: Joi.string().valid('tesseract', 'textract').default('tesseract'),
  OCR_LANGUAGES: Joi.string()
    .pattern(/^[a-z]{3}(\+[a-z]{3})*$/)
    .default('eng'),
  OCR_TEXT_LOCALE: Joi.string().min(2).max(35).default('en'),
  TESSERACT_WORKER_PATH: Joi.string().allow('').default(''),
  TESSERACT_LANG_PATH: Joi.string().allow('').default(''),
  TESSERACT_CACHE_PATH: Joi.string().allow('').default('.tesseract-cache'),
  TEXTRACT_REGION: Joi.string().default('us-east-1'),

  TTS_PROVIDER: Joi.string().valid('aws', 'google').default('aws'),
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: Joi.string().allow('').default(''),
  AWS_SECRET_ACCESS_KEY: Joi.string().allow('').default(''),
  AWS_POLLY_ENGINE: Joi.string()
    .valid('neural', 'standard', 'generative', 'long-form')
    .default('neural'),
  AWS_POLLY_VOICE_CHILD_FRIENDLY: Joi.string().default('Joanna'),
  AWS_POLLY_VOICE_CALM_NARRATOR: Joi.string().default('Danielle'),
  AWS_POLLY_VOICE_NEURAL_FRIENDLY: Joi.string().default('Matthew'),

  GOOGLE_APPLICATION_CREDENTIALS: Joi.string().allow('').default(''),
  GOOGLE_TTS_LANGUAGE_CODE: Joi.string().default('en-US'),
  GOOGLE_TTS_VOICE_CHILD_FRIENDLY: Joi.string().default('en-US-Neural2-A'),
  GOOGLE_TTS_VOICE_CALM_NARRATOR: Joi.string().default('en-US-Neural2-C'),
  GOOGLE_TTS_VOICE_NEURAL_FRIENDLY: Joi.string().default('en-US-Neural2-D'),
}).unknown(true);

export interface AppPreferences {
  readonly nodeEnv: 'development' | 'test' | 'production';
  readonly isProduction: boolean;
  readonly port: number;
  readonly apiPrefix: string;
  readonly trustProxy: boolean;
  readonly docsEnabled: boolean;
  readonly corsOrigins: string[];
  readonly publicBaseUrl: string;
}

export interface AuthPreferences {
  readonly accessSecret: string;
  readonly accessTokenTtlSeconds: number;
  readonly qrSecret: string;
  readonly qrTokenTtlSeconds: number;
  readonly visualSecret: string;
  readonly adminApiKey: string;
  readonly bcryptRounds: number;
  readonly loginMaxAttempts: number;
  readonly loginLockMinutes: number;
}

export interface OcrPreferences {
  readonly provider: 'tesseract' | 'textract';
  readonly languages: string;
  readonly textLocale: string;
  readonly tesseractWorkerPath: string;
  readonly tesseractLangPath: string;
  readonly tesseractCachePath: string;
  readonly textractRegion: string;
  readonly maxFileBytes: number;
  readonly allowedMimeTypes: readonly string[];
}

export interface TtsPreferences {
  readonly provider: 'aws' | 'google';
  readonly urlSigningSecret: string;
  readonly urlTtlSeconds: number;
  readonly region: string;
  readonly awsAccessKeyId: string;
  readonly awsSecretAccessKey: string;
  readonly awsPollyEngine: 'neural' | 'standard' | 'generative' | 'long-form';
  readonly awsVoices: Readonly<Record<string, string>>;
  readonly googleApplicationCredentials: string;
  readonly googleLanguageCode: string;
  readonly googleVoices: Readonly<Record<string, string>>;
}

export interface Configuration {
  readonly app: AppPreferences;
  readonly auth: AuthPreferences;
  readonly ocr: OcrPreferences;
  readonly tts: TtsPreferences;
  readonly throttle: { readonly ttlMs: number; readonly limit: number };
}

export const configuration = (): Configuration => {
  const nodeEnv = (process.env.NODE_ENV ?? 'development') as AppPreferences['nodeEnv'];
  return {
    app: {
      nodeEnv,
      isProduction: nodeEnv === 'production',
      port: Number(process.env.PORT ?? 3000),
      apiPrefix: process.env.API_PREFIX ?? 'api/v1',
      trustProxy: process.env.TRUST_PROXY === 'true',
      docsEnabled: process.env.DOCS_ENABLED !== 'false',
      corsOrigins: (process.env.CORS_ORIGINS ?? '')
        .split(',')
        .map((origin) => origin.trim())
        .filter((origin) => origin.length > 0),
      publicBaseUrl: (process.env.PUBLIC_BASE_URL ?? 'http://localhost:3000').replace(/\/+$/, ''),
    },
    auth: {
      accessSecret: process.env.JWT_ACCESS_SECRET ?? '',
      accessTokenTtlSeconds: Number(process.env.JWT_ACCESS_TTL_SECONDS ?? 43_200),
      qrSecret: process.env.QR_TOKEN_SECRET ?? '',
      qrTokenTtlSeconds: Number(process.env.QR_TOKEN_TTL_SECONDS ?? 31_536_000),
      visualSecret: process.env.VISUAL_TOKEN_SECRET ?? '',
      adminApiKey: process.env.ADMIN_API_KEY ?? '',
      bcryptRounds: Number(process.env.BCRYPT_ROUNDS ?? 12),
      loginMaxAttempts: Number(process.env.LOGIN_MAX_ATTEMPTS ?? 5),
      loginLockMinutes: Number(process.env.LOGIN_LOCK_MINUTES ?? 15),
    },
    ocr: {
      provider: (process.env.OCR_PROVIDER ?? 'tesseract') as OcrPreferences['provider'],
      languages: process.env.OCR_LANGUAGES ?? 'eng',
      textLocale: process.env.OCR_TEXT_LOCALE ?? 'en',
      tesseractWorkerPath: process.env.TESSERACT_WORKER_PATH ?? '',
      tesseractLangPath: process.env.TESSERACT_LANG_PATH ?? '',
      tesseractCachePath: process.env.TESSERACT_CACHE_PATH ?? '.tesseract-cache',
      textractRegion: process.env.TEXTRACT_REGION ?? 'us-east-1',
      maxFileBytes: 10 * 1024 * 1024,
      allowedMimeTypes: ['image/png', 'image/jpeg', 'image/webp'],
    },
    tts: {
      provider: (process.env.TTS_PROVIDER ?? 'aws') as TtsPreferences['provider'],
      urlSigningSecret: process.env.TTS_URL_SIGNING_SECRET ?? '',
      urlTtlSeconds: Number(process.env.TTS_URL_TTL_SECONDS ?? 3600),
      region: process.env.AWS_REGION ?? 'us-east-1',
      awsAccessKeyId: process.env.AWS_ACCESS_KEY_ID ?? '',
      awsSecretAccessKey: process.env.AWS_SECRET_ACCESS_KEY ?? '',
      awsPollyEngine: (process.env.AWS_POLLY_ENGINE ??
        'neural') as TtsPreferences['awsPollyEngine'],
      awsVoices: {
        CHILD_FRIENDLY: process.env.AWS_POLLY_VOICE_CHILD_FRIENDLY ?? 'Joanna',
        CALM_NARRATOR: process.env.AWS_POLLY_VOICE_CALM_NARRATOR ?? 'Danielle',
        NEURAL_FRIENDLY: process.env.AWS_POLLY_VOICE_NEURAL_FRIENDLY ?? 'Matthew',
      },
      googleApplicationCredentials: process.env.GOOGLE_APPLICATION_CREDENTIALS ?? '',
      googleLanguageCode: process.env.GOOGLE_TTS_LANGUAGE_CODE ?? 'en-US',
      googleVoices: {
        CHILD_FRIENDLY: process.env.GOOGLE_TTS_VOICE_CHILD_FRIENDLY ?? 'en-US-Neural2-A',
        CALM_NARRATOR: process.env.GOOGLE_TTS_VOICE_CALM_NARRATOR ?? 'en-US-Neural2-C',
        NEURAL_FRIENDLY: process.env.GOOGLE_TTS_VOICE_NEURAL_FRIENDLY ?? 'en-US-Neural2-D',
      },
    },
    throttle: {
      ttlMs: Number(process.env.THROTTLE_TTL_MS ?? 60_000),
      limit: Number(process.env.THROTTLE_LIMIT ?? 300),
    },
  };
};

export function validateEnvironment(config: Record<string, unknown>): Record<string, unknown> {
  const { error, value } = envValidationSchema.validate(config, {
    abortEarly: false,
    convert: true,
  });

  if (error) {
    throw new Error(`Environment validation failed: ${error.message}`);
  }

  return value as Record<string, unknown>;
}
