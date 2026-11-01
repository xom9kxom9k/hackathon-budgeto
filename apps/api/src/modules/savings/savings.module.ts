import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Module,
  Param,
  Put,
  UseGuards,
} from '@nestjs/common';
import {
  CommandBus,
  CommandHandler,
  CqrsModule,
  ICommandHandler,
  IQueryHandler,
  QueryBus,
  QueryHandler,
} from '@nestjs/cqrs';
import { InjectRepository, TypeOrmModule } from '@nestjs/typeorm';
import { IsNumber, IsString, Matches, Max, MaxLength, Min } from 'class-validator';
import { Repository } from 'typeorm';
import { AuthModule } from '../auth/auth.module';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/current-user.decorator';
import type { AuthPrincipal } from '../auth/auth.types';
import { SavingsGoalEntity } from './entities/savings-goal.entity';

export class SaveSavingsGoalDto {
  @IsString() @Matches(/\S/) @MaxLength(80) name!: string;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0.01) @Max(1_000_000_000_000) target!: number;
  @IsNumber({ maxDecimalPlaces: 2 }) @Min(0) @Max(1_000_000_000_000) saved!: number;
}
export class GetSavingsGoalQuery {
  constructor(
    readonly userId: string,
    readonly currency: string,
  ) {}
}
export class SaveSavingsGoalCommand {
  constructor(
    readonly userId: string,
    readonly currency: string,
    readonly input: SaveSavingsGoalDto,
  ) {}
}
function view(goal: SavingsGoalEntity | null) {
  return goal
    ? {
        name: goal.name,
        target: Number(goal.target),
        saved: Number(goal.saved),
        currency: goal.currency,
      }
    : null;
}
@QueryHandler(GetSavingsGoalQuery)
export class GetSavingsGoalHandler implements IQueryHandler<GetSavingsGoalQuery> {
  constructor(
    @InjectRepository(SavingsGoalEntity) private readonly goals: Repository<SavingsGoalEntity>,
  ) {}
  async execute(query: GetSavingsGoalQuery) {
    return view(
      await this.goals.findOne({ where: { userId: query.userId, currency: query.currency } }),
    );
  }
}
@CommandHandler(SaveSavingsGoalCommand)
export class SaveSavingsGoalHandler implements ICommandHandler<SaveSavingsGoalCommand> {
  constructor(
    @InjectRepository(SavingsGoalEntity) private readonly goals: Repository<SavingsGoalEntity>,
  ) {}
  async execute(command: SaveSavingsGoalCommand) {
    await this.goals.upsert(
      {
        userId: command.userId,
        currency: command.currency,
        name: command.input.name.trim(),
        target: command.input.target.toFixed(2),
        saved: command.input.saved.toFixed(2),
      },
      ['userId', 'currency'],
    );
    return view(
      await this.goals.findOne({ where: { userId: command.userId, currency: command.currency } }),
    );
  }
}
@Controller('savings-goals')
@UseGuards(AuthGuard)
export class SavingsController {
  constructor(
    private readonly queries: QueryBus,
    private readonly commands: CommandBus,
  ) {}
  private currency(value: string) {
    const currency = value.toUpperCase();
    if (!/^[A-Z]{3}$/.test(currency)) throw new BadRequestException('Invalid currency');
    return currency;
  }
  @Get(':currency') get(@CurrentUser() user: AuthPrincipal, @Param('currency') currency: string) {
    return this.queries.execute(new GetSavingsGoalQuery(user.userId, this.currency(currency)));
  }
  @Put(':currency') save(
    @CurrentUser() user: AuthPrincipal,
    @Param('currency') currency: string,
    @Body() body: SaveSavingsGoalDto,
  ) {
    return this.commands.execute(
      new SaveSavingsGoalCommand(user.userId, this.currency(currency), body),
    );
  }
}
@Module({
  imports: [CqrsModule, AuthModule, TypeOrmModule.forFeature([SavingsGoalEntity])],
  controllers: [SavingsController],
  providers: [GetSavingsGoalHandler, SaveSavingsGoalHandler],
})
export class SavingsModule {}
