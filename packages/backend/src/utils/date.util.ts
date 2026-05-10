// 모든 "오늘/내일/이번주/다음주" 계산을 APP_TIMEZONE 기준으로 통일.
// 서버 process TZ에 의존하지 않도록 Intl.DateTimeFormat으로 명시적 변환.
// 내부 Date 앵커는 항상 UTC 자정을 사용 → 일(day) 단위 산술이 timezone-agnostic.
// 모듈 로드 시점이 아니라 호출 시점에 읽어야 함.
// ConfigModule(dotenv)이 NestFactory.create() 안에서 .env를 로드하기 때문에,
// 이 모듈이 먼저 import되면 process.env.APP_TIMEZONE은 아직 비어 있음.
const getAppTz = (): string => process.env.APP_TIMEZONE ?? "Asia/Seoul";

export interface DateRange {
  start: Date;
  end: Date;
}

// getCalendarPartsInTz는 주어진 instant(기본값은 현재 시각)를 APP_TZ 기준으로 연/월/일로 분해하여 반환하는 함수다.
const getCalendarPartsInTz = (
  instant: Date = new Date(),
): { year: number; month: number; day: number } => {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: getAppTz(),
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // Intl.DateTimeFormat 객체를 생성할 때 timeZone 옵션으로 APP_TZ를 지정하여 instant를 해당 시간대 기준으로 포맷한다.
  const parts = fmt.formatToParts(instant);
  const get = (k: "year" | "month" | "day") =>
    Number(parts.find((p) => p.type === k)?.value);
  return { year: get("year"), month: get("month"), day: get("day") };
};

// calendarToUtcMidnight는 calendar date를 UTC 자정 앵커 Date로 변환하는 함수다.
const calendarToUtcMidnight = (parts: {
  year: number;
  month: number;
  day: number;
}): Date => new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
// Date.UTC()를 사용하여 calendar date를 UTC 자정 앵커 Date로 변환한다. month는 0-11이므로 -1 한다.

const getWeekdayInTz = (instant: Date = new Date()): number => {
  const wd = new Intl.DateTimeFormat("en-US", {
    timeZone: getAppTz(),
    weekday: "short",
  }).format(instant);
  return ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(wd);
};

export const startOfDay = (date: Date): Date => {
  const value = new Date(date);
  value.setUTCHours(0, 0, 0, 0);
  return value;
};

export const endOfDay = (date: Date): Date => {
  const value = new Date(date);
  value.setUTCHours(23, 59, 59, 999);
  return value;
};

// TypeORM의 Date 변환기. Date 객체를 ISO 문자열로 저장하고, 불러올 때 다시 Date 객체로 변환한다.
export const addDays = (date: Date, days: number): Date => {
  const value = new Date(date);
  value.setUTCDate(value.getUTCDate() + days);
  return value;
};

// "오늘 00:00 in APP_TZ" 를 UTC 자정 앵커 Date로 반환.
export const getTodayDate = (): Date =>
  calendarToUtcMidnight(getCalendarPartsInTz());

export const getTomorrowDate = (): Date => addDays(getTodayDate(), 1);

export const getThisWeekRange = (): DateRange => {
  const today = getTodayDate();
  const day = getWeekdayInTz();
  const offsetToMonday = day === 0 ? -6 : 1 - day;
  const start = addDays(today, offsetToMonday);
  const end = endOfDay(addDays(start, 6));
  return { start, end };
};

export const getNextWeekRange = (): DateRange => {
  const thisWeek = getThisWeekRange();
  const start = addDays(thisWeek.start, 7);
  const end = endOfDay(addDays(start, 6));
  return { start, end };
};

// UTC 앵커 Date의 calendar date를 YYYY-MM-DD로 변환.
// (앵커가 항상 UTC 자정이므로 getUTC* 사용해야 의도한 날짜가 나옴.)
export const getDateOnlyString = (date: Date): string => {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

// addDays를 사용하여 date에 days만큼 더한 후, getDateOnlyString으로 YYYY-MM-DD 문자열로 변환한다.
export const getDateAfterDaysString = (days: number): string => {
  return getDateOnlyString(addDays(getTodayDate(), days));
};

export const isWithinRange = (date: Date, range: DateRange): boolean => {
  return date >= range.start && date <= range.end;
};

// "YYYY-MM-DD" 문자열을 UTC 자정 앵커 Date로 변환.
// 비교/산술용. 호출부에서 new Date(`${str}T00:00:00`)을 쓰면 LOCAL TZ로 파싱돼 버그.
export const parseDateOnlyString = (value: string): Date => {
  return new Date(`${value}T00:00:00Z`);
};
