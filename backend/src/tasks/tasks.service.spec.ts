import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { TasksService } from './tasks.service';
import { TaskLifecycleService } from './task-lifecycle.service';
import { TaskTimeService } from './task-time.service';
import { Task, TaskStatus } from './task.entity';
import { TaskTimeEntry } from './task-time-entry.entity';
import { StatusTransition } from './status-transition.entity';
import { TaskBlock } from '../blocks/task-block.entity';
import { TeamMember } from '../team-members/team-member.entity';
import { AuditLogService } from '../audit-log/audit-log.service';
import { EventsGateway } from '../gateway/events.gateway';

// ---------------------------------------------------------------------------
// Mock factories
// ---------------------------------------------------------------------------

const makeTask = (overrides: Partial<Task> = {}): Task =>
  ({
    id: 'task-1',
    title: 'Test Task',
    description: null,
    status: TaskStatus.BACKLOG,
    ownerId: 'member-1',
    isBlocked: false,
    completedAt: null,
    undoCount: 0,
    isArchived: false,
    estimatedHours: null,
    predictedCompletion: null,
    timeEntries: [],
    comments: [],
    blocks: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
    deletedAt: null,
    ...overrides,
  }) as unknown as Task;

const makeMember = (overrides: Partial<TeamMember> = {}): TeamMember =>
  ({
    id: 'member-1',
    name: 'Test Member',
    username: 'test.member',
    isAdmin: false,
    ...overrides,
  }) as unknown as TeamMember;

// ---------------------------------------------------------------------------
// Repository mock
// ---------------------------------------------------------------------------

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  count: jest.fn(),
  save: jest.fn(),
  create: jest.fn(),
  update: jest.fn(),
  softRemove: jest.fn(),
  createQueryBuilder: jest.fn(() => ({
    leftJoinAndSelect: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    andWhere: jest.fn().mockReturnThis(),
    orderBy: jest.fn().mockReturnThis(),
    getMany: jest.fn().mockResolvedValue([]),
  })),
  query: jest.fn(),
});

const auditLogMock = { log: jest.fn(), findByEntity: jest.fn() };
const eventsMock = { emitToAll: jest.fn(), emitToOrg: jest.fn() };

// ---------------------------------------------------------------------------
// Test Suite — TasksService (CRUD + getHistory)
// ---------------------------------------------------------------------------

describe('TasksService', () => {
  let service: TasksService;
  let taskRepo: ReturnType<typeof createMockRepo>;
  let memberRepo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    taskRepo = createMockRepo();
    memberRepo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TasksService,
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: AuditLogService, useValue: auditLogMock },
        { provide: EventsGateway, useValue: eventsMock },
      ],
    }).compile();

    service = module.get<TasksService>(TasksService);

    jest.clearAllMocks();
    auditLogMock.log.mockResolvedValue(undefined);
  });

  describe('findAll', () => {
    it('should filter tasks by orgId when provided', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([makeTask({ orgId: 'org-1' } as any)]),
      };
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll('org-1');

      expect(qb.andWhere).toHaveBeenCalledWith(expect.stringContaining('orgId'), {
        orgId: 'org-1',
      });
    });

    it('should not add orgId filter when orgId is null', async () => {
      const qb = {
        leftJoinAndSelect: jest.fn().mockReturnThis(),
        where: jest.fn().mockReturnThis(),
        andWhere: jest.fn().mockReturnThis(),
        orderBy: jest.fn().mockReturnThis(),
        getMany: jest.fn().mockResolvedValue([]),
      };
      taskRepo.createQueryBuilder.mockReturnValue(qb);

      await service.findAll(null);

      const orgIdCall = qb.andWhere.mock.calls.find(
        (call: any[]) => typeof call[0] === 'string' && call[0].includes('orgId'),
      );
      expect(orgIdCall).toBeUndefined();
    });
  });

  describe('create', () => {
    it('should create a task with BACKLOG status', async () => {
      const dto = { title: 'New Task', description: 'Description', estimatedHours: 2 };
      const savedTask = makeTask({ title: dto.title, status: TaskStatus.BACKLOG });

      taskRepo.create.mockReturnValue(savedTask);
      taskRepo.save.mockResolvedValue(savedTask);

      const result = await service.create(dto, 'member-1');

      expect(taskRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ title: dto.title, status: TaskStatus.BACKLOG }),
      );
      expect(result.status).toBe(TaskStatus.BACKLOG);
    });

    it('should log audit event on create', async () => {
      const dto = { title: 'Audit Task' };
      const savedTask = makeTask();

      taskRepo.create.mockReturnValue(savedTask);
      taskRepo.save.mockResolvedValue(savedTask);

      await service.create(dto, 'member-1');

      expect(auditLogMock.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'create', entityType: 'task' }),
      );
    });

    it('should include orgId when provided', async () => {
      const dto = { title: 'Org Task' };
      const savedTask = makeTask({ orgId: 'org-1' } as any);

      taskRepo.create.mockReturnValue(savedTask);
      taskRepo.save.mockResolvedValue(savedTask);

      await service.create(dto, 'member-1', 'org-1');

      expect(taskRepo.create).toHaveBeenCalledWith(expect.objectContaining({ orgId: 'org-1' }));
    });
  });

  describe('update', () => {
    it('should update task title and description', async () => {
      const task = makeTask({ status: TaskStatus.BACKLOG, ownerId: 'member-1' });
      const updatedTask = makeTask({ title: 'Updated Title' });

      taskRepo.findOne.mockResolvedValue(task);
      memberRepo.findOne.mockResolvedValue(makeMember({ isAdmin: false }));
      taskRepo.save.mockResolvedValue(updatedTask);

      await service.update(task.id, { title: 'Updated Title' }, 'member-1');

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ title: 'Updated Title' }),
      );
    });

    it('should throw BadRequestException when editing a DONE task', async () => {
      const task = makeTask({ status: TaskStatus.DONE, ownerId: 'member-1' });

      taskRepo.findOne.mockResolvedValue(task);
      memberRepo.findOne.mockResolvedValue(makeMember({ isAdmin: false }));

      await expect(service.update(task.id, { title: 'No edit' }, 'member-1')).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('findOne', () => {
    it('should throw NotFoundException for non-existent task', async () => {
      taskRepo.findOne.mockResolvedValue(null);

      await expect(service.findOne('non-existent-id')).rejects.toThrow(NotFoundException);
    });

    it('should return task with relations', async () => {
      const task = makeTask();
      taskRepo.findOne.mockResolvedValue(task);

      const result = await service.findOne(task.id);

      expect(result).toEqual(task);
      expect(taskRepo.findOne).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: task.id } }),
      );
    });
  });
});

// ---------------------------------------------------------------------------
// Test Suite — TaskLifecycleService
// ---------------------------------------------------------------------------

describe('TaskLifecycleService', () => {
  let lifecycle: TaskLifecycleService;
  let taskRepo: ReturnType<typeof createMockRepo>;
  let blockRepo: ReturnType<typeof createMockRepo>;
  let memberRepo: ReturnType<typeof createMockRepo>;
  let timeEntryRepo: ReturnType<typeof createMockRepo>;
  let transitionRepo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    taskRepo = createMockRepo();
    blockRepo = createMockRepo();
    memberRepo = createMockRepo();
    timeEntryRepo = createMockRepo();
    transitionRepo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TaskLifecycleService,
        TaskTimeService,
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(TaskTimeEntry), useValue: timeEntryRepo },
        { provide: getRepositoryToken(StatusTransition), useValue: transitionRepo },
        { provide: getRepositoryToken(TaskBlock), useValue: blockRepo },
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: AuditLogService, useValue: auditLogMock },
        { provide: EventsGateway, useValue: eventsMock },
      ],
    }).compile();

    lifecycle = module.get<TaskLifecycleService>(TaskLifecycleService);

    jest.clearAllMocks();
    auditLogMock.log.mockResolvedValue(undefined);
    transitionRepo.create.mockReturnValue({});
    transitionRepo.save.mockResolvedValue({});
  });

  describe('activate', () => {
    it('should activate a BACKLOG task and assign owner', async () => {
      const task = makeTask({ status: TaskStatus.BACKLOG, ownerId: 'member-1' });
      const activatedTask = makeTask({ status: TaskStatus.IN_PROGRESS, ownerId: 'member-1' });

      taskRepo.findOne
        .mockResolvedValueOnce(task) // findOneBasic
        .mockResolvedValue(activatedTask); // findOneFull
      taskRepo.count.mockResolvedValue(0);
      taskRepo.save.mockResolvedValue(activatedTask);

      await lifecycle.activate(task.id, 'member-1');

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TaskStatus.IN_PROGRESS }),
      );
    });

    it('should throw ConflictException when member already has an active task', async () => {
      const task = makeTask({ status: TaskStatus.BACKLOG });

      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.count.mockResolvedValue(1);

      await expect(lifecycle.activate(task.id, 'member-1')).rejects.toThrow(ConflictException);
    });

    it('should throw BadRequestException when task is already active', async () => {
      const task = makeTask({ status: TaskStatus.IN_PROGRESS });

      taskRepo.findOne.mockResolvedValue(task);

      await expect(lifecycle.activate(task.id, 'member-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when task is DONE (use undo instead)', async () => {
      const task = makeTask({ status: TaskStatus.DONE });

      taskRepo.findOne.mockResolvedValue(task);

      await expect(lifecycle.activate(task.id, 'member-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when blocked task is activated without resolution note', async () => {
      const task = makeTask({ status: TaskStatus.STANDBY, isBlocked: true });

      taskRepo.findOne.mockResolvedValue(task);
      taskRepo.count.mockResolvedValue(0);

      await expect(lifecycle.activate(task.id, 'member-1', undefined, undefined)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should allow non-owner to activate their own tasks', async () => {
      const task = makeTask({ status: TaskStatus.BACKLOG, ownerId: 'member-1' });
      const activatedTask = makeTask({ status: TaskStatus.IN_PROGRESS });

      taskRepo.findOne.mockResolvedValueOnce(task).mockResolvedValue(activatedTask);
      taskRepo.count.mockResolvedValue(0);
      taskRepo.save.mockResolvedValue(activatedTask);

      await lifecycle.activate(task.id, 'member-1');

      expect(taskRepo.save).toHaveBeenCalled();
    });

    it('should throw BadRequestException when non-admin tries to activate for another member', async () => {
      const task = makeTask({ status: TaskStatus.BACKLOG, ownerId: 'member-1' });

      taskRepo.findOne.mockResolvedValueOnce(task);
      memberRepo.findOne.mockResolvedValue(makeMember({ isAdmin: false }));
      taskRepo.count.mockResolvedValue(0);

      await expect(lifecycle.activate(task.id, 'member-1', 'member-2', undefined)).rejects.toThrow(
        BadRequestException,
      );
    });
  });

  describe('block', () => {
    it('should block an IN_PROGRESS task', async () => {
      const task = makeTask({ status: TaskStatus.IN_PROGRESS, ownerId: 'member-1' });
      const blockedTask = makeTask({ status: TaskStatus.STANDBY, isBlocked: true });

      taskRepo.findOne.mockResolvedValueOnce(task).mockResolvedValue(blockedTask);
      memberRepo.findOne.mockResolvedValue(makeMember({ isAdmin: false }));
      timeEntryRepo.findOne.mockResolvedValue(null);
      blockRepo.query.mockResolvedValue(undefined);
      taskRepo.save.mockResolvedValue(blockedTask);

      await lifecycle.block(task.id, 'member-1', 'Blocked by external dependency');

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TaskStatus.STANDBY, isBlocked: true }),
      );
    });

    it('should throw BadRequestException when blocking a non-IN_PROGRESS task', async () => {
      const task = makeTask({ status: TaskStatus.BACKLOG, ownerId: 'member-1' });

      taskRepo.findOne.mockResolvedValue(task);
      memberRepo.findOne.mockResolvedValue(makeMember({ isAdmin: false }));

      await expect(lifecycle.block(task.id, 'member-1', 'reason')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw ForbiddenException when non-owner tries to block', async () => {
      const task = makeTask({ status: TaskStatus.IN_PROGRESS, ownerId: 'member-2' });

      taskRepo.findOne.mockResolvedValue(task);
      memberRepo.findOne.mockResolvedValue(makeMember({ id: 'member-1', isAdmin: false }));

      await expect(lifecycle.block(task.id, 'member-1', 'reason')).rejects.toThrow(
        ForbiddenException,
      );
    });
  });

  describe('complete', () => {
    it('should complete an IN_PROGRESS task', async () => {
      const task = makeTask({ status: TaskStatus.IN_PROGRESS, ownerId: 'member-1' });
      const doneTask = makeTask({ status: TaskStatus.DONE, completedAt: new Date() });

      taskRepo.findOne.mockResolvedValueOnce(task).mockResolvedValue(doneTask);
      memberRepo.findOne.mockResolvedValue(makeMember({ isAdmin: false }));
      timeEntryRepo.findOne.mockResolvedValue(null);
      taskRepo.save.mockResolvedValue(doneTask);

      await lifecycle.complete(task.id, 'member-1');

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TaskStatus.DONE }),
      );
    });

    it('should throw BadRequestException when completing a non-IN_PROGRESS task', async () => {
      const task = makeTask({ status: TaskStatus.BACKLOG, ownerId: 'member-1' });

      taskRepo.findOne.mockResolvedValue(task);
      memberRepo.findOne.mockResolvedValue(makeMember({ isAdmin: false }));

      await expect(lifecycle.complete(task.id, 'member-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('undo', () => {
    it('should move DONE task back to STANDBY and increment undoCount', async () => {
      const task = makeTask({
        status: TaskStatus.DONE,
        ownerId: 'member-1',
        undoCount: 0,
        completedAt: new Date(),
      });
      const undoneTask = makeTask({ status: TaskStatus.STANDBY, undoCount: 1 });

      taskRepo.findOne.mockResolvedValueOnce(task).mockResolvedValue(undoneTask);
      memberRepo.findOne.mockResolvedValue(makeMember({ isAdmin: false }));
      taskRepo.save.mockResolvedValue(undoneTask);

      await lifecycle.undo(task.id, 'member-1');

      expect(taskRepo.save).toHaveBeenCalledWith(
        expect.objectContaining({ status: TaskStatus.STANDBY, undoCount: 1 }),
      );
    });

    it('should throw BadRequestException when undo limit (3x) is reached', async () => {
      const task = makeTask({
        status: TaskStatus.DONE,
        ownerId: 'member-1',
        undoCount: 3,
      });

      taskRepo.findOne.mockResolvedValue(task);
      memberRepo.findOne.mockResolvedValue(makeMember({ isAdmin: false }));

      await expect(lifecycle.undo(task.id, 'member-1')).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException when undoing a non-DONE task', async () => {
      const task = makeTask({ status: TaskStatus.IN_PROGRESS, ownerId: 'member-1' });

      taskRepo.findOne.mockResolvedValue(task);
      memberRepo.findOne.mockResolvedValue(makeMember({ isAdmin: false }));

      await expect(lifecycle.undo(task.id, 'member-1')).rejects.toThrow(BadRequestException);
    });
  });

  describe('softDelete', () => {
    it('should soft delete a task (admin only)', async () => {
      const task = makeTask({ ownerId: 'member-2' });

      taskRepo.findOne.mockResolvedValue(task);
      memberRepo.findOne.mockResolvedValue(makeMember({ id: 'admin-1', isAdmin: true }));
      timeEntryRepo.findOne.mockResolvedValue(null);
      taskRepo.save.mockResolvedValue(task);
      taskRepo.softRemove.mockResolvedValue(task);

      const result = await lifecycle.softDelete(task.id, 'admin-1');

      expect(result).toEqual({ message: 'Task removida' });
      expect(taskRepo.softRemove).toHaveBeenCalled();
    });

    it('should throw ForbiddenException when non-admin tries to delete', async () => {
      taskRepo.findOne.mockResolvedValue(makeTask());
      memberRepo.findOne.mockResolvedValue(makeMember({ isAdmin: false }));

      await expect(lifecycle.softDelete('task-1', 'member-1')).rejects.toThrow(ForbiddenException);
    });
  });
});
