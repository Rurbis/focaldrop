import { Injectable, Module, type OnModuleDestroy } from '@nestjs/common';

import { runtimeDatabaseUrl } from './config.js';
import { createDatabase } from './database.js';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  private readonly connection = createDatabase(runtimeDatabaseUrl());

  get db() {
    return this.connection.db;
  }

  async onModuleDestroy(): Promise<void> {
    await this.connection.client.end();
  }
}

@Module({
  providers: [DatabaseService],
  exports: [DatabaseService],
})
export class DatabaseModule {}
