import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { HeartbeatService } from './heartbeat.service';
import { TeamMember } from '../team-members/team-member.entity';
import { Task, TaskStatus } from '../tasks/task.entity';
import { TaskTimeEntry } from '../tasks/task-time-entry.entity';
import { WorkScheduleService } from '../work-schedule/work-schedule.service';

// ---------------------------------------------------------------------------
// Mocks
// ---------------------------------------------------------------------------

const createMockRepo = () => ({
  findOne: jest.fn(),
  find: jest.fn(),
  update: jest.fn(),
  save: jest.fn(),
});

const workScheduleMock = {
  getEffectiveSchedule: jest.fn(),
  calculateExpectedHours: jest.fn(),
};

const dataSourceMock = {
  query: jest.fn(),
};

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

describe('HeartbeatService', () => {
  let service: HeartbeatService;
  let memberRepo: ReturnType<typeof createMockRepo>;
  let taskRepo: ReturnType<typeof createMockRepo>;
  let timeEntryRepo: ReturnType<typeof createMockRepo>;

  beforeEach(async () => {
    memberRepo = createMockRepo();
    taskRepo = createMockRepo();
    timeEntryRepo = createMockRepo();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        HeartbeatService,
        { provide: getRepositoryToken(TeamMember), useValue: memberRepo },
        { provide: getRepositoryToken(Task), useValue: taskRepo },
        { provide: getRepositoryToken(TaskTimeEntry), useValue: timeEntryRepo },
        { provide: WorkScheduleService, useValue: workScheduleMock },
        { provide: DataSource, useValue: dataSourceMock },
      ],
    }).compile();

    service = module.get<HeartbeatService>(HeartbeatService);

    jest.clearAllMocks();

    // Defaults
    workScheduleMock.getEffectiveSchedule.mockResolvedValue({});
    workScheduleMock.calculateExpectedHours.mockReturnValue(8);
    dataSourceMock.query.mockResolvedValue([{ total_seconds: '0' }]);
  });

  // -------------------------------------------------------------------------
  // heartbeat()
  // -------------------------------------------------------------------------

  describe('heartbeat', () => {
    it('should update lastHeartbeatAt for the member', async () => {
      memberRepo.update.mockResolvedValue({});
      taskRepo.findOne.mockResolvedValue(null); // no active task
      dataSourceMock.query.mockResolvedValue([{ total_seconds: '3600' }]); // 1h worked

      await service.heartbeat('member-1');

      expect(memberRepo.update).toHaveBeenCalledWith('member-1', {
        lastHeartbeatAt: expect.any(Date),
      });
    });

    it('should return workedHoursToday from DB query', async () => {
      memberRepo.update.mockResolvedValue({});
      taskRepo.findOne.mockResolvedValue(null);
      dataSourceMock.query.mockResolvedValue([{ total_seconds: '7200' }]); // 2h

      const result = await service.heartbeat('member-1');

      expect(result.workedHoursToday).toBe(2);
    });

    it('should return activeTaskId when member has IN_PROGRESS task', async () => {
      const activeTask = {
        id: 'task-1',
        status: TaskStatus.IN_PROGRESS,
        ownerId: 'member-1',
        estimatedHours: null,
      };

      memberRepo.update.mockResolvedValue({});
      taskRepo.findOne.mockResolvedValue(activeTask);
      timeEntryRepo.findOne.mockResolvedValue({ id: 'entry-1', endedAt: null }); // open entry
      dataSourceMock.query.mockResolvedValue([{ total_seconds: '1800' }]);

      const result = await service.heartbeat('member-1');

      expect(result.activeTaskId).toBe('task-1');
      expect(result.isPaused).toBe(false);
    });

    it('should mark isPaused = true when active task has no open time entry', async () => {
      const activeTask = {
        id: 'task-1',
        status: TaskStatus.IN_PROGRESS,
        ownerId: 'member-1',
        estimatedHours: null,
      };

      memberRepo.update.mockResolvedValue({});
      taskRepo.findOne.mockResolvedValue(activeTask);
      timeEntryRepo.findOne.mockResolvedValue(null); // no open entry = paused
      dataSourceMock.query.mockResolvedValue([{ total_seconds: '1800' }]);

      const result = await service.heartbeat('member-1');

      expect(result.isPaused).toBe(true);
    });

    it('should return null activeTaskId when member has no active task', async () => {
      memberRepo.update.mockResolvedValue({});
      taskRepo.findOne.mockResolvedValue(null);
      dataSourceMock.query.mockResolvedValue([{ total_seconds: '0' }]);

      const result = await service.heartbeat('member-1');

      expect(result.activeTaskId).toBeNull();
      expect(result.isPaused).toBe(false);
    });

    it('should mark taskDeadlineExceeded when hours spent exceed estimated', async () => {
      const activeTask = {
        id: 'task-1',
        status: TaskStatus.IN_PROGRESS,
        ownerId: 'member-1',
        estimatedHours: 2, // 2h estimated
      };

      memberRepo.update.mockResolvedValue({});
      taskRepo.findOne.mockResolvedValue(activeTask);
      timeEntryRepo.findOne.mockResolvedValue({ id: 'entry-1', endedAt: null });
      taskRepo.update.mockResolvedValue({});

      dataSourceMock.query
        .mockResolvedValueOnce([{ total_seconds: '3600' }]) // workedHoursToday: 1h
        .mockResolvedValueOnce([{ total_seconds: '10800' }]); // taskTotalHoursSpent: 3h (> 2h)

      const result = await service.heartbeat('member-1');

      expect(result.taskDeadlineExceeded).toBe(true);
      expect(result.taskPredictedCompletion).toBeNull();
    });

    it('should return meetingHoursToday as 0 (activity log removed)', async () => {
      memberRepo.update.mockResolvedValue({});
      taskRepo.findOne.mockResolvedValue(null);
      dataSourceMock.query.mockResolvedValue([{ total_seconds: '0' }]);

      const result = await service.heartbeat('member-1');

      expect(result.meetingHoursToday).toBe(0);
    });
  });
});
