import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TaskBlock } from './task-block.entity';
import { BlocksService } from './blocks.service';
import { BlocksController } from './blocks.controller';

@Module({
  imports: [TypeOrmModule.forFeature([TaskBlock])],
  providers: [BlocksService],
  controllers: [BlocksController],
})
export class BlocksModule {}
