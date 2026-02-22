import 'reflect-metadata';
import { DataSource } from 'typeorm';
import { TeamMember } from './team-members/team-member.entity';
import { Task } from './tasks/task.entity';
import { TaskTimeEntry } from './tasks/task-time-entry.entity';
import { StatusTransition } from './tasks/status-transition.entity';
import { TaskComment } from './comments/task-comment.entity';
import { TaskBlock } from './blocks/task-block.entity';
import { AuditLog } from './audit-log/audit-log.entity';
import { WorkSchedule } from './work-schedule/work-schedule.entity';

const dataSource = new DataSource({
  type: 'postgres',
  host: process.env.DATABASE_HOST || 'localhost',
  port: parseInt(process.env.DATABASE_PORT || '5432'),
  username: process.env.DATABASE_USER || 'dashboard_user',
  password: process.env.DATABASE_PASSWORD || 'dashboard_pass',
  database: process.env.DATABASE_NAME || 'team_dashboard',
  entities: [
    TeamMember,
    Task,
    TaskTimeEntry,
    StatusTransition,
    TaskComment,
    TaskBlock,
    AuditLog,
    WorkSchedule,
  ],
  synchronize: false,
});

async function migrate() {
  await dataSource.initialize();
  console.log('Connected to database');

  const queryRunner = dataSource.createQueryRunner();

  try {
    // Step 1: Add new enum values to the tasks_status_enum
    console.log('Step 1: Adding new enum values...');

    // Check if enum type exists and what values it has
    const enumCheck = await queryRunner.query(
      `SELECT enumlabel FROM pg_enum
       JOIN pg_type ON pg_enum.enumtypid = pg_type.oid
       WHERE pg_type.typname = 'tasks_status_enum'`,
    );
    const existingValues = enumCheck.map((r: any) => r.enumlabel);
    console.log('Current enum values:', existingValues);

    if (!existingValues.includes('standby')) {
      await queryRunner.query(
        `ALTER TYPE tasks_status_enum ADD VALUE IF NOT EXISTS 'standby' AFTER 'backlog'`,
      );
      console.log('Added "standby" to enum');
    }

    if (!existingValues.includes('in_progress')) {
      await queryRunner.query(
        `ALTER TYPE tasks_status_enum ADD VALUE IF NOT EXISTS 'in_progress' AFTER 'standby'`,
      );
      console.log('Added "in_progress" to enum');
    }

    // Step 2: Migrate 'active' tasks to 'in_progress'
    console.log('\nStep 2: Migrating active -> in_progress...');
    if (existingValues.includes('active')) {
      // Need to recreate enum since we can't rename values easily
      // First update the column to varchar temporarily
      await queryRunner.query(`ALTER TABLE tasks ALTER COLUMN status TYPE varchar(20)`);
      await queryRunner.query(`UPDATE tasks SET status = 'in_progress' WHERE status = 'active'`);

      // Drop old enum and create new one
      await queryRunner.query(`DROP TYPE IF EXISTS tasks_status_enum`);
      await queryRunner.query(
        `CREATE TYPE tasks_status_enum AS ENUM ('backlog', 'standby', 'in_progress', 'done')`,
      );
      await queryRunner.query(
        `ALTER TABLE tasks ALTER COLUMN status TYPE tasks_status_enum USING status::tasks_status_enum`,
      );
      console.log('Migrated all active tasks to in_progress');
    }

    // Step 3: Migrate blocked backlog tasks to standby
    console.log('\nStep 3: Migrating blocked backlog tasks to standby...');
    const blockedBacklog = await queryRunner.query(
      `SELECT id, owner_id FROM tasks
       WHERE status = 'backlog' AND is_blocked = true AND deleted_at IS NULL`,
    );
    console.log(`Found ${blockedBacklog.length} blocked backlog tasks`);

    for (const task of blockedBacklog) {
      await queryRunner.query(`UPDATE tasks SET status = 'standby' WHERE id = $1`, [task.id]);
      console.log(`  Migrated blocked task ${task.id} to standby`);
    }

    // Step 4: Migrate backlog tasks that have time entries/comments (not virgin) to standby
    console.log('\nStep 4: Migrating non-virgin backlog tasks to standby...');
    const nonVirginBacklog = await queryRunner.query(
      `SELECT DISTINCT t.id, t.owner_id FROM tasks t
       LEFT JOIN task_time_entries tte ON t.id = tte.task_id
       LEFT JOIN task_comments tc ON t.id = tc.task_id
       WHERE t.status = 'backlog'
         AND t.deleted_at IS NULL
         AND (tte.id IS NOT NULL OR tc.id IS NOT NULL OR t.owner_id IS NOT NULL)`,
    );
    console.log(`Found ${nonVirginBacklog.length} non-virgin backlog tasks`);

    for (const task of nonVirginBacklog) {
      await queryRunner.query(`UPDATE tasks SET status = 'standby' WHERE id = $1`, [task.id]);
      console.log(`  Migrated non-virgin task ${task.id} to standby`);
    }

    // Step 5: Clean backlog tasks — remove owner from pure backlog tasks
    console.log('\nStep 5: Cleaning pure backlog tasks (removing owners)...');
    const pureBacklog = await queryRunner.query(
      `UPDATE tasks SET owner_id = NULL
       WHERE status = 'backlog' AND owner_id IS NOT NULL AND deleted_at IS NULL
       RETURNING id`,
    );
    console.log(`Cleaned owner from ${pureBacklog.length} pure backlog tasks`);

    // Step 6: Create status_transitions table if not exists (TypeORM synchronize will handle this,
    // but let's backfill from audit_log)
    console.log('\nStep 6: Backfilling status_transitions from audit_log...');

    // Check if status_transitions table exists
    const tableExists = await queryRunner.query(
      `SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'status_transitions')`,
    );

    if (tableExists[0].exists) {
      const auditLogs = await queryRunner.query(
        `SELECT al.entity_id as task_id, al.old_data, al.new_data, al.performed_by, al.performed_at
         FROM audit_logs al
         WHERE al.entity_type = 'task'
           AND al.action = 'update'
           AND al.old_data->>'status' IS NOT NULL
           AND al.new_data->>'status' IS NOT NULL
           AND al.old_data->>'status' != al.new_data->>'status'
         ORDER BY al.performed_at ASC`,
      );

      let backfilled = 0;
      for (const log of auditLogs) {
        let fromStatus = log.old_data?.status || 'backlog';
        let toStatus = log.new_data?.status || 'backlog';

        // Map old status values to new ones
        if (fromStatus === 'active') fromStatus = 'in_progress';
        if (toStatus === 'active') toStatus = 'in_progress';

        await queryRunner.query(
          `INSERT INTO status_transitions (id, task_id, from_status, to_status, transitioned_at, transitioned_by)
           VALUES (uuid_generate_v4(), $1, $2, $3, $4, $5)`,
          [log.task_id, fromStatus, toStatus, log.performed_at, log.performed_by],
        );
        backfilled++;
      }
      console.log(`Backfilled ${backfilled} status transitions`);
    } else {
      console.log('status_transitions table not found — will be created by TypeORM synchronize');
    }

    console.log('\nMigration completed successfully!');
  } catch (err) {
    console.error('Migration failed:', err);
    throw err;
  } finally {
    await queryRunner.release();
    await dataSource.destroy();
  }
}

migrate().catch((err) => {
  console.error('Migration script failed:', err);
  process.exit(1);
});
