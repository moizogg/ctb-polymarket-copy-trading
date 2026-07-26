import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const isProd = process.env.NODE_ENV === 'production';

  // Security headers (API-friendly: disable CSP that breaks Swagger)
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  const corsOrigins = process.env.CORS_ORIGINS?.split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  if (isProd && !corsOrigins?.length) {
    // eslint-disable-next-line no-console
    console.warn(
      '[CTB] WARNING: NODE_ENV=production but CORS_ORIGINS is empty. Set CORS_ORIGINS to your frontend URL.',
    );
  }

  app.enableCors({
    // Dev & Prod: allow matching origins, or true if not explicitly restricted
    origin: corsOrigins?.length ? corsOrigins : true,
    credentials: true,
  });

  if (isProd && !process.env.API_KEY?.trim()) {
    // eslint-disable-next-line no-console
    console.warn(
      '[CTB] WARNING: NODE_ENV=production without API_KEY. Set API_KEY to protect mutating routes.',
    );
  }

  const config = new DocumentBuilder()
    .setTitle('CTB Copy Trading API')
    .setDescription(
      'Production API for the operator dashboard: bot control, followers, dashboard stats, alerts, operator wallets, portfolio, charts.',
    )
    .setVersion('1.2')
    .addApiKey(
      { type: 'apiKey', name: 'x-api-key', in: 'header' },
      'api-key',
    )
    .addTag('Health', 'Liveness')
    .addTag('Bot', 'Kill switch / status')
    .addTag('Dashboard', 'Stats, recent trades, weekly reports, comparative analysis')
    .addTag('Followers (Followed Wallets)', 'Leaders to copy')
    .addTag('Operator Wallets', 'Linked browser wallets (MetaMask, etc.)')
    .addTag('Alerts', 'Performance alerts')
    .addTag('Polymarket', 'Activity and proxy wallet helpers')
    .addTag('Portfolio', 'Live positions and bot reconcile')
    .addTag('Charts', 'Price history, market search, bot equity')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api', app, document);

  // Railway (and most PaaS) need 0.0.0.0 — not localhost — or public URL returns 502
  const port = Number(process.env.PORT ?? 3000);
  const rawHost = process.env.HOST?.trim();
  const host = !rawHost || rawHost === 'localhost' || rawHost === '127.0.0.1' ? '0.0.0.0' : rawHost;
  await app.listen(port, host);
  // eslint-disable-next-line no-console
  console.log(`CTB API listening on http://${host}:${port} (docs: /api)`);
}
bootstrap();
