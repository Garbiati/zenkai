import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskComment } from './task-comment.entity';
import { Task } from '../tasks/task.entity';
import { CommentsService } from './comments.service';
import { CommentsController } from './comments.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskComment, Task])],
  providers: [CommentsService],
  controllers: [CommentsController],
})
export class CommentsModule {}
