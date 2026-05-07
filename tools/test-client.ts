import { NestFactory } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { ClientProxy, ClientsModule, Transport } from '@nestjs/microservices';
import { AUTH_SERVICE, AUTH_SERVICE_PORT, AUDIT_SERVICE, AUDIT_SERVICE_PORT } from '@arc/shared';
import { firstValueFrom } from 'rxjs';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: AUTH_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: AUTH_SERVICE_PORT },
      },
      {
        name: AUDIT_SERVICE,
        transport: Transport.TCP,
        options: { host: 'localhost', port: AUDIT_SERVICE_PORT },
      },
    ]),
  ],
})
class TestModule {}

async function main() {
  const app = await NestFactory.createApplicationContext(TestModule);

  const authClient = app.get<ClientProxy>(AUTH_SERVICE);
  const auditClient = app.get<ClientProxy>(AUDIT_SERVICE);

  await authClient.connect();
  await auditClient.connect();

  console.log('--- Testing auth-service ---');

  const validateResult = await firstValueFrom(
    authClient.send({ cmd: 'validate_user' }, { userId: 'user-1' }),
  );
  console.log('validate_user:', validateResult);

  const getResult = await firstValueFrom(
    authClient.send({ cmd: 'get_user' }, { userId: 'user-1' }),
  );
  console.log('get_user:', getResult);

  console.log('\n--- Testing audit-service ---');

  auditClient.emit('audit_log_created', {
    userId: 'user-1',
    action: 'LOGIN',
    resource: 'auth',
  });
  console.log('Emitted audit_log_created event');

  // Small delay so the event is processed before querying
  await new Promise((r) => setTimeout(r, 500));

  const logs = await firstValueFrom(
    auditClient.send({ cmd: 'get_audit_logs' }, { userId: 'user-1' }),
  );
  console.log('get_audit_logs:', logs);

  await app.close();
}

main().catch(console.error);
