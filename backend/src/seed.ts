import 'reflect-metadata';
import { DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { TeamMember } from './team-members/team-member.entity';
import { Task, TaskStatus } from './tasks/task.entity';
import { TaskTimeEntry } from './tasks/task-time-entry.entity';
import { StatusTransition } from './tasks/status-transition.entity';
import { TaskComment } from './comments/task-comment.entity';
import { TaskBlock } from './blocks/task-block.entity';
import { AuditLog } from './audit-log/audit-log.entity';
import { WorkSchedule } from './work-schedule/work-schedule.entity';
import { Organization } from './organizations/organization.entity';
import { Membership } from './organizations/membership.entity';
import { Invitation } from './organizations/invitation.entity';

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
    Organization,
    Membership,
    Invitation,
  ],
  synchronize: true,
});

const members = [
  { username: 'a.garbiati', name: 'Alessandro Garbiati' },
  { username: 'p.perondini', name: 'Pedro Perondini' },
  { username: 's.ferreira', name: 'Silvio Ferreira' },
  { username: 'a.figueiredo', name: 'Abel Figueiredo' },
  { username: 'l.reis', name: 'Lucas Reis' },
  { username: 'r.casado', name: 'Rafael Casado' },
  { username: 'f.junior', name: 'Francisco Júnior' },
];

// Helper: create a Date for N minutes ago from now (timezone-safe)
function minutesAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 1000);
}

// Helper: create a Date for N hours ago from now (timezone-safe)
function hoursAgo(n: number): Date {
  return new Date(Date.now() - n * 60 * 60 * 1000);
}

async function seed() {
  await dataSource.initialize();
  console.log('Connected to database');

  const memberRepo = dataSource.getRepository(TeamMember);
  const taskRepo = dataSource.getRepository(Task);
  const timeEntryRepo = dataSource.getRepository(TaskTimeEntry);
  const blockRepo = dataSource.getRepository(TaskBlock);
  const scheduleRepo = dataSource.getRepository(WorkSchedule);
  const orgRepo = dataSource.getRepository(Organization);
  const membershipRepo = dataSource.getRepository(Membership);

  // Check if already seeded
  const existingCount = await memberRepo.count();
  if (existingCount > 0) {
    // Ensure admin flag is set even if DB already existed
    await dataSource.query(`UPDATE team_members SET is_admin = true WHERE username = 'a.garbiati'`);
    // Ensure global work schedule exists
    const globalExists = await scheduleRepo
      .createQueryBuilder('ws')
      .where('ws.member_id IS NULL')
      .getOne();
    if (!globalExists) {
      await scheduleRepo.save(
        scheduleRepo.create({
          memberId: null as any,
          startTime: '08:00',
          lunchStart: '12:00',
          lunchEnd: '13:00',
          endTime: '17:00',
        }),
      );
      console.log('Created global work schedule');
    }
    console.log('Database already seeded. Updated admin flag.');
    await dataSource.destroy();
    return;
  }

  const passwordHash = await bcrypt.hash('backend123', 10);

  // ── Create members ──────────────────────────────────────────────────
  const savedMembers: Record<string, TeamMember> = {};
  for (const m of members) {
    const member = memberRepo.create({
      name: m.name,
      username: m.username,
      passwordHash,
      mustChangePassword: true,
      isAdmin: m.username === 'a.garbiati',
      // Don't set lastHeartbeatAt - prevents heartbeat cron from auto-closing seed entries
    });
    const saved = await memberRepo.save(member);
    savedMembers[m.username] = saved;
    console.log(`Created member: ${m.name} (${m.username})`);
  }

  // ── Create seed organization ─────────────────────────────────────────
  const owner = savedMembers['a.garbiati'];
  const org = orgRepo.create({
    name: 'Seed Team',
    slug: 'seed-team',
    plan: 'free',
    ownerId: owner.id,
  });
  const savedOrg = await orgRepo.save(org);
  console.log(`Created organization: ${savedOrg.name} (${savedOrg.id})`);

  // ── Create memberships for all seed members ──────────────────────────
  for (const [username, member] of Object.entries(savedMembers)) {
    const ms = membershipRepo.create({
      orgId: savedOrg.id,
      memberId: member.id,
      role: username === 'a.garbiati' ? 'owner' : 'member',
    });
    await membershipRepo.save(ms);
  }
  console.log(`Created ${Object.keys(savedMembers).length} memberships`);

  // ── Task 1: matching 1.5 ── a.garbiati ── in_progress ──────────────
  // Morning session 3h (closed, ended 1h ago) + afternoon session started 10min ago (open)
  // Total today: ~3h10m
  {
    const owner = savedMembers['a.garbiati'];
    const task = taskRepo.create({
      title: 'matching 1.5',
      description: 'refatoração da matching',
      status: TaskStatus.IN_PROGRESS,
      ownerId: owner.id,
      orgId: savedOrg.id,
      estimatedHours: 16,
      createdBy: owner.id,
    });
    const saved = await taskRepo.save(task);

    // Morning session: 4h ago to 1h ago (3h closed)
    await timeEntryRepo.save(
      timeEntryRepo.create({
        taskId: saved.id,
        teamMemberId: owner.id,
        startedAt: hoursAgo(4),
        endedAt: hoursAgo(1),
      }),
    );

    // Afternoon session: started 10 min ago (open)
    await timeEntryRepo.save(
      timeEntryRepo.create({
        taskId: saved.id,
        teamMemberId: owner.id,
        startedAt: minutesAgo(10),
      }),
    );

    console.log(`Created task: ${saved.title} -> ${owner.name} [in_progress, 2 entries, ~3h10m]`);
  }

  // ── Task 2: socket 2.0 ── p.perondini ── in_progress ─────────────
  // Morning session 2h15m (closed) + afternoon session started 15min ago (open)
  // Total today: ~2h30m
  {
    const owner = savedMembers['p.perondini'];
    const task = taskRepo.create({
      title: 'socket 2.0',
      description: 'adequação do socket 2.0 no backend',
      status: TaskStatus.IN_PROGRESS,
      ownerId: owner.id,
      orgId: savedOrg.id,
      estimatedHours: 24,
      createdBy: owner.id,
    });
    const saved = await taskRepo.save(task);

    // Morning session: 3.5h ago to 1.25h ago (2h15m closed)
    await timeEntryRepo.save(
      timeEntryRepo.create({
        taskId: saved.id,
        teamMemberId: owner.id,
        startedAt: minutesAgo(210),
        endedAt: minutesAgo(75),
      }),
    );

    // Afternoon session: started 15 min ago (open)
    await timeEntryRepo.save(
      timeEntryRepo.create({
        taskId: saved.id,
        teamMemberId: owner.id,
        startedAt: minutesAgo(15),
      }),
    );

    console.log(`Created task: ${saved.title} -> ${owner.name} [in_progress, 2 entries, ~2h30m]`);
  }

  // ── Task 3: upgrade de framework .net ── s.ferreira ── in_progress ─
  // Single session started 40min ago (open)
  // Total today: ~40m
  {
    const owner = savedMembers['s.ferreira'];
    const task = taskRepo.create({
      title: 'upgrade de framework .net',
      description: 'atualização do .net framework do 3.1 ao 10 nos microserviços',
      status: TaskStatus.IN_PROGRESS,
      ownerId: owner.id,
      orgId: savedOrg.id,
      estimatedHours: 40,
      createdBy: owner.id,
    });
    const saved = await taskRepo.save(task);

    // Single open session: started 40 min ago
    await timeEntryRepo.save(
      timeEntryRepo.create({
        taskId: saved.id,
        teamMemberId: owner.id,
        startedAt: minutesAgo(40),
      }),
    );

    console.log(`Created task: ${saved.title} -> ${owner.name} [in_progress, 1 entry, ~40m]`);
  }

  // ── Task 4: agendamento automático ── backlog (no owner) ───────────
  {
    const creator = savedMembers['a.garbiati'];
    const task = taskRepo.create({
      title: 'agendamento automático',
      description: 'chatbot de agendamento via whatsapp',
      status: TaskStatus.BACKLOG,
      orgId: savedOrg.id,
      estimatedHours: 8,
      createdBy: creator.id,
    });
    const saved = await taskRepo.save(task);
    console.log(`Created task: ${saved.title} -> unassigned [backlog]`);
  }

  // ── Task 5: cadastro 1.5 ── backlog (no owner, no estimate) ───────
  {
    const creator = savedMembers['a.garbiati'];
    const task = taskRepo.create({
      title: 'cadastro 1.5',
      description: 'criar login com telefone',
      status: TaskStatus.BACKLOG,
      orgId: savedOrg.id,
      createdBy: creator.id,
    });
    const saved = await taskRepo.save(task);
    console.log(`Created task: ${saved.title} -> unassigned [backlog, no estimate]`);
  }

  // ── Task 6: elegibilidade ── r.casado ── done ──────────────────────
  // 2 closed entries from yesterday. completedAt = ~20h ago
  {
    const owner = savedMembers['r.casado'];
    const task = taskRepo.create({
      title: 'elegibilidade',
      description: 'adicionar regras duras no agendamento de especialidades',
      status: TaskStatus.DONE,
      ownerId: owner.id,
      orgId: savedOrg.id,
      completedAt: hoursAgo(20),
      estimatedHours: 12,
      createdBy: owner.id,
    });
    const saved = await taskRepo.save(task);

    // Yesterday morning: 27h ago to 24h ago (3h)
    await timeEntryRepo.save(
      timeEntryRepo.create({
        taskId: saved.id,
        teamMemberId: owner.id,
        startedAt: hoursAgo(27),
        endedAt: hoursAgo(24),
      }),
    );

    // Yesterday afternoon: 23h ago to 19.5h ago (3.5h)
    await timeEntryRepo.save(
      timeEntryRepo.create({
        taskId: saved.id,
        teamMemberId: owner.id,
        startedAt: hoursAgo(23),
        endedAt: minutesAgo(20 * 60 - 30), // 19.5h ago
      }),
    );

    console.log(`Created task: ${saved.title} -> ${owner.name} [done, 2 closed entries]`);
  }

  // ── Task 7: guias 3.0 ── f.junior ── standby + blocked ────────────
  // 1 closed entry from yesterday. Block with reason.
  {
    const owner = savedMembers['f.junior'];
    const task = taskRepo.create({
      title: 'guias 3.0',
      description: 'adequar guias para modelos pré configurados',
      status: TaskStatus.STANDBY,
      ownerId: owner.id,
      orgId: savedOrg.id,
      isBlocked: true,
      estimatedHours: 20,
      createdBy: owner.id,
    });
    const saved = await taskRepo.save(task);

    // Yesterday session: 25.5h ago to 24h ago (1.5h, closed when blocked)
    await timeEntryRepo.save(
      timeEntryRepo.create({
        taskId: saved.id,
        teamMemberId: owner.id,
        startedAt: minutesAgo(25 * 60 + 30), // 25.5h ago
        endedAt: hoursAgo(24),
      }),
    );

    // Block record
    const block = blockRepo.create({
      task: saved,
      blockedBy: owner,
      blockReason: 'Aguardando definição do layout pelo time de produto',
      blockedAt: hoursAgo(24),
    });
    await blockRepo.save(block);

    console.log(`Created task: ${saved.title} -> ${owner.name} [standby, blocked]`);
  }

  // ── Global work schedule ───────────────────────────────────────────
  const existingSchedule = await scheduleRepo
    .createQueryBuilder('ws')
    .where('ws.member_id IS NULL')
    .getOne();
  if (!existingSchedule) {
    await scheduleRepo.save(
      scheduleRepo.create({
        memberId: null as any,
        startTime: '08:00',
        lunchStart: '12:00',
        lunchEnd: '13:00',
        endTime: '17:00',
      }),
    );
    console.log('Created global work schedule');
  }

  console.log('Seed completed!');
  await dataSource.destroy();
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
