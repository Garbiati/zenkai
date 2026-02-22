import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Invitation } from '../organizations/invitation.entity';
import { Organization } from '../organizations/organization.entity';
import { Membership } from '../organizations/membership.entity';
import { TeamMember } from '../team-members/team-member.entity';
import { InvitationsService } from './invitations.service';
import { InvitationsController } from './invitations.controller';
import { MailModule } from '../mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Invitation, Organization, Membership, TeamMember]),
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'dev-secret',
      signOptions: { expiresIn: '8h' },
    }),
    MailModule,
  ],
  providers: [InvitationsService],
  controllers: [InvitationsController],
})
export class InvitationsModule {}
