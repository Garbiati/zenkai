import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource, IsNull } from 'typeorm';
import { Cron } from '@nestjs/schedule';
import { TeamMember } from '../team-members/team-member.entity';
import { Task, TaskStatus } from '../tasks/task.entity';
import { TaskTimeEntry } from '../tasks/task-time-entry.entity';
import { WorkScheduleService } from '../work-schedule/work-schedule.service';

@Injectable()
export class HeartbeatService {
  private readonly logger = new Logger(HeartbeatService.name);

  constructor(
    @InjectRepository(TeamMember)
    private memberRepo: Repository<TeamMember>,
    @InjectRepository(Task)
    private taskRepo: Repository<Task>,
    @InjectRepository(TaskTimeEntry)
    private timeEntryRepo: Repository<TaskTimeEntry>,
    private workScheduleService: WorkScheduleService,
    private dataSource: DataSource,
  ) {}

  async heartbeat(memberId: string) {
    // Update lastHeartbeatAt
    await this.memberRepo.update(memberId, { lastHeartbeatAt: new Date() });

    // Find active task for this member (IN_PROGRESS)
    const activeTask = await this.taskRepo.findOne({
      where: { ownerId: memberId, status: TaskStatus.IN_PROGRESS },
    });

    // Check if paused (active task but no open time entry)
    let isPaused = false;
    if (activeTask) {
      const openEntry = await this.timeEntryRepo.findOne({
        where: { taskId: activeTask.id, endedAt: IsNull() },
      });
      isPaused = !openEntry;
    }

    // Calculate worked hours today (clamp entries that cross midnight)
    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const result = await this.dataSource.query(
      `SELECT COALESCE(SUM(
        EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - GREATEST(started_at, $2::timestamp)))
      ), 0) as total_seconds
      FROM task_time_entries
      WHERE team_member_id = $1
        AND COALESCE(ended_at, NOW()) > $2::timestamp`,
      [memberId, startOfDay],
    );
    const workedHoursToday = Math.round((parseFloat(result[0].total_seconds) / 3600) * 100) / 100;

    // Get expected hours from work schedule
    const schedule = await this.workScheduleService.getEffectiveSchedule(memberId);
    const expectedHours = this.workScheduleService.calculateExpectedHours(schedule);

    // Calculate estimation/prediction for active task
    let taskEstimatedHours: number | null = null;
    let taskTotalHoursSpent = 0;
    let taskPredictedCompletion: string | null = null;
    let taskDeadlineExceeded = false;

    if (activeTask) {
      taskEstimatedHours = activeTask.estimatedHours ? Number(activeTask.estimatedHours) : null;

      // Calculate total hours spent on this task (all entries)
      const taskHoursResult = await this.dataSource.query(
        `SELECT COALESCE(SUM(
          EXTRACT(EPOCH FROM (COALESCE(ended_at, NOW()) - started_at))
        ), 0) as total_seconds
        FROM task_time_entries
        WHERE task_id = $1`,
        [activeTask.id],
      );
      taskTotalHoursSpent =
        Math.round((parseFloat(taskHoursResult[0].total_seconds) / 3600) * 100) / 100;

      if (taskEstimatedHours !== null && taskTotalHoursSpent > 0) {
        if (taskTotalHoursSpent >= taskEstimatedHours) {
          taskDeadlineExceeded = true;
          taskPredictedCompletion = null;
        } else {
          // Calculate velocity: distinct working days with entries
          const workDaysResult = await this.dataSource.query(
            `SELECT COUNT(DISTINCT DATE(started_at)) as work_days
            FROM task_time_entries
            WHERE task_id = $1`,
            [activeTask.id],
          );
          let workDays = parseInt(workDaysResult[0].work_days) || 1;

          const velocity = taskTotalHoursSpent / workDays; // h per working day
          const remainingHours = taskEstimatedHours - taskTotalHoursSpent;
          const remainingDays = Math.ceil(remainingHours / velocity);

          // Calculate predicted date skipping weekends
          const predicted = new Date();
          let daysAdded = 0;
          while (daysAdded < remainingDays) {
            predicted.setDate(predicted.getDate() + 1);
            const day = predicted.getDay();
            if (day !== 0 && day !== 6) {
              daysAdded++;
            }
          }

          taskPredictedCompletion = predicted.toISOString();

          // Update task in DB
          await this.taskRepo.update(activeTask.id, {
            predictedCompletion: predicted,
          });
        }
      }
    }

    return {
      activeTaskId: activeTask?.id || null,
      isPaused,
      workedHoursToday,
      expectedHours,
      meetingHoursToday: 0,
      taskEstimatedHours,
      taskTotalHoursSpent,
      taskPredictedCompletion,
      taskDeadlineExceeded,
    };
  }

  @Cron('0 */2 * * * *')
  async closeStaleTimeEntries() {
    try {
      const result = await this.dataSource.query(
        `UPDATE task_time_entries tte
         SET ended_at = NOW()
         FROM tasks t, team_members tm
         WHERE tte.task_id = t.id
           AND t.owner_id = tm.id
           AND tte.ended_at IS NULL
           AND t.status = 'in_progress'
           AND t.deleted_at IS NULL
           AND tm.last_heartbeat_at < NOW() - INTERVAL '2 minutes'`,
      );
      if (result[1] > 0) {
        this.logger.log(`Closed ${result[1]} stale time entries due to heartbeat timeout`);
      }
    } catch (err) {
      this.logger.error('Failed to close stale time entries', err);
    }
  }
}
