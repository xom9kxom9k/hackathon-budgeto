import { ConflictException, HttpException, HttpStatus, NotFoundException } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ArchiveCategoryCommand, CategoryMutationResult, CreateCategoryCommand, UpdateCategoryCommand } from '../categories.commands';
import { CategoryEntity } from '../entities/category.entity';

function view(category: CategoryEntity): CategoryMutationResult {
  return { id: category.id, name: category.name, kind: category.kind, archivedAt: category.archivedAt?.toISOString() ?? null };
}

function duplicate(): never {
  throw new ConflictException({ code: 'CATEGORY_NAME_TAKEN' });
}

async function findDuplicate(repository: Repository<CategoryEntity>, userId: string, name: string, kind: CategoryEntity['kind'], id?: string) {
  const query = repository.createQueryBuilder('category').where('category.user_id = :userId', { userId }).andWhere('category.archived_at IS NULL').andWhere('category.kind = :kind', { kind }).andWhere('LOWER(category.name) = LOWER(:name)', { name });
  if (id) query.andWhere('category.id != :id', { id });
  return query.getOne();
}

@CommandHandler(CreateCategoryCommand)
export class CreateCategoryHandler implements ICommandHandler<CreateCategoryCommand> {
  constructor(@InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>) {}

  async execute(command: CreateCategoryCommand): Promise<CategoryMutationResult> {
    const name = command.name.trim();
    if (await findDuplicate(this.categories, command.userId, name, command.kind)) duplicate();
    try {
      return view(await this.categories.save(this.categories.create({ userId: command.userId, name, kind: command.kind, archivedAt: null })));
    } catch (error) {
      if (error instanceof Error && error.message.includes('UQ_categories_active_user_name_kind_ci')) duplicate();
      throw error;
    }
  }
}

@CommandHandler(UpdateCategoryCommand)
export class UpdateCategoryHandler implements ICommandHandler<UpdateCategoryCommand> {
  constructor(@InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>) {}

  async execute(command: UpdateCategoryCommand): Promise<CategoryMutationResult> {
    const category = await this.categories.findOne({ where: { id: command.id, userId: command.userId } });
    if (!category || category.archivedAt) throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND' });
    const name = command.name.trim();
    if (await findDuplicate(this.categories, command.userId, name, category.kind, category.id)) duplicate();
    category.name = name;
    try {
      return view(await this.categories.save(category));
    } catch (error) {
      if (error instanceof Error && error.message.includes('UQ_categories_active_user_name_kind_ci')) duplicate();
      throw error;
    }
  }
}

@CommandHandler(ArchiveCategoryCommand)
export class ArchiveCategoryHandler implements ICommandHandler<ArchiveCategoryCommand> {
  constructor(@InjectRepository(CategoryEntity) private readonly categories: Repository<CategoryEntity>) {}

  async execute(command: ArchiveCategoryCommand): Promise<CategoryMutationResult> {
    const category = await this.categories.findOne({ where: { id: command.id, userId: command.userId } });
    if (!category) throw new NotFoundException({ code: 'CATEGORY_NOT_FOUND' });
    if (category.archivedAt) throw new HttpException({ code: 'REFERENCE_ALREADY_ARCHIVED' }, HttpStatus.CONFLICT);
    category.archivedAt = new Date();
    return view(await this.categories.save(category));
  }
}
