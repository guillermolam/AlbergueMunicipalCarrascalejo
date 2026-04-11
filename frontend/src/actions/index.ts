import { booking } from './booking';
import { profile } from './profile';
import { adminSettings } from './admin/settings';

export const server = {
  booking,
  profile,
  admin: {
    settings: adminSettings,
  },
};
