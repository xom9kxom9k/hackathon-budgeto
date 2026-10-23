import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

import { UpdateProfileDto, UpdateProfilePreferencesDto } from './profile-security.dto';

describe('profile DTOs', () => {
  it('rejects unknown fields and invalid profile values', async () => {
    const errors = await validate(
      plainToInstance(UpdateProfileDto, {
        displayName: '',
        goals: ['safe'],
        extra: true,
      }),
      { whitelist: true, forbidNonWhitelisted: true },
    );

    expect(errors.length).toBeGreaterThan(0);
  });

  it('accepts an empty goals list and supported preferences', async () => {
    const profileErrors = await validate(
      plainToInstance(UpdateProfileDto, { displayName: 'Ada', goals: [] }),
    );
    const preferenceErrors = await validate(
      plainToInstance(UpdateProfilePreferencesDto, { locale: 'en', timezone: 'UTC' }),
    );

    expect(profileErrors).toHaveLength(0);
    expect(preferenceErrors).toHaveLength(0);
  });
});
