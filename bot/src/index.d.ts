declare module 'got' {
  import * as got from 'got/dist/source';
  export = got;
}

type DeepPartial<T> = {
  [P in keyof T]?: DeepPartial<T[P]>;
};

type ElementType<T extends ReadonlyArray<unknown>> = T extends ReadonlyArray<infer ElementType> ? ElementType : never;

declare module NodeJS {
  interface ProcessEnv {
    STAGING: 'dev' | 'prod';
    DATA_MOUNT_PATH: string;
    DATA_MOUNT_PATH_VM_SERVICES?: string;

    DISCORD_TOKEN?: string;
    DISCORD_CLIENT_ID?: string;
    DISCORD_CLIENT_SECRET?: string;
    MAIN_CHANNEL_ID?: string;

    /** Deprecated */
    OCR_SPACE_API_KEY?: string;
    /** Deprecated */
    RATER_HOST?: string;

    S3_ACCESS_KEY_ID?: string;
    S3_SECRET_ACCESS_KEY?: string;
    S3_REGION?: string;
    S3_BUCKET?: string;
    S3_PUBLIC?: string;

    TELEGRAM_TOKEN?: string;
    TELEGRAM_WH_HOST?: string;
    TELEGRAM_WH_PORT?: string;

    OPENAI_API_KEY?: string;

    POSTGRES_HOST?: string;
    POSTGRES_PORT?: string;
    POSTGRES_USER?: string;
    POSTGRES_PASSWORD?: string;
    POSTGRES_DB?: string;
    POSTGRES_UGID?: string;

    REDIS_HOST?: string;
    REDIS_PORT?: string;
    REDIS_USER?: string;
    REDIS_PASSWORD?: string;

    RABBITMQ_URI: string;

    ADMIN_HOST?: string;
    ADMIN_HOST_LE?: string;

    API_HOST?: string;
    API_HOST_LE?: string;
  }
}
