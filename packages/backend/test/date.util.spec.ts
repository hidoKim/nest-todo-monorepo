import {
  getDateOnlyString,
  getNextWeekRange,
  getThisWeekRange,
  getTodayDate,
} from '../src/utils/date.util';

describe('date.util', () => {
  it('returns today in yyyy-mm-dd format', () => {
    const today = getTodayDate();
    const formatted = getDateOnlyString(today);

    expect(formatted).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns non-overlapping this-week and next-week ranges', () => {
    const thisWeek = getThisWeekRange();
    const nextWeek = getNextWeekRange();

    expect(thisWeek.end.getTime()).toBeLessThan(nextWeek.start.getTime());
  });
});
