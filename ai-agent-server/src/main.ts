import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable validation pipes
  app.useGlobalPipes(new ValidationPipe({
    transform: true,
    whitelist: true,
  }));

  // Enable CORS
  app.enableCors();

  // Start the server
  const port = process.env.PORT || 3001;
  await app.listen(port);
  console.log(`AI Agent Server is running on: http://localhost:${port}`);
}

bootstrap(); 