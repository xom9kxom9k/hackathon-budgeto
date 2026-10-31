import 'reflect-metadata';
import { DataSource } from 'typeorm';

const dataSource = new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL ?? 'postgresql://budgetto:budgetto_dev@localhost:5432/budgetto',
  entities: [`${__dirname}/../modules/**/entities/*.entity{.js,.ts}`],
  migrations: [`${__dirname}/migrations/*{.js,.ts}`],
  synchronize: false,
});

export default dataSource;
