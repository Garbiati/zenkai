import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AuthModule } from './auth/auth.module';
import { TeamMembersModule } from './team-members/team-members.module';
import { TasksModule } from './tasks/tasks.module';
import { CommentsModule } from './comments/comments.module';
import { BlocksModule } from './blocks/blocks.module';
import { AuditLogModule } from './audit-log/audit-log.module';
import { WorkScheduleModule } from './work-schedule/work-schedule.module';
import { HeartbeatModule } from './heartbeat/heartbeat.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { InvitationsModule } from './invitations/invitations.module';
import { EventsModule } from './gateway/events.module';
import { ScheduleModule } from '@nestjs/schedule';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ScheduleModule.forRoot(),
    // S2: Global rate limiting — 100 req/60s by default; tighter limits on auth endpoints
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DATABASE_HOST || 'localhost',
      port: parseInt(process.env.DATABASE_PORT || '5432'),
      username: process.env.DATABASE_USER || 'dashboard_user',
      password: process.env.DATABASE_PASSWORD || 'dashboard_pass',
      database: process.env.DATABASE_NAME || 'team_dashboard',
      autoLoadEntities: true,
      synchronize: true,
    }),
    AuthModule,
    TeamMembersModule,
    TasksModule,
    CommentsModule,
    BlocksModule,
    AuditLogModule,
    WorkScheduleModule,
    HeartbeatModule,
    OrganizationsModule,
    InvitationsModule,
    EventsModule,
  ],
  providers: [
    // S2: Apply ThrottlerGuard globally to all endpoints
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
