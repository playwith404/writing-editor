export default () => ({
  app: {
    port: Number(process.env.PORT ?? 3000),
    nodeEnv: process.env.NODE_ENV ?? 'development',
  },
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: Number(process.env.DB_PORT ?? 5432),
    username: process.env.DB_USER ?? 'cowrite',
    password: process.env.DB_PASSWORD ?? '',
    name: process.env.DB_NAME ?? 'cowrite',
  },
  jwt: {
    secret: process.env.JWT_SECRET ?? 'change_me',
    expiresIn: process.env.JWT_EXPIRES_IN ?? '15m',
    refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? '7d',
  },
  elastic: {
    node: process.env.ELASTICSEARCH_NODE ?? 'http://localhost:9200',
    apiKey: process.env.ELASTICSEARCH_API_KEY,
  },
});
