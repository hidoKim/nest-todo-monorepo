// BE의 APP_TIMEZONE과 일치시켜야 "오늘/내일" 표시와 BE 필터 결과가 어긋나지 않음.
// 사용자 브라우저 로컬 TZ에 의존하지 않도록 Intl로 명시 변환.
const APP_TZ = process.env.REACT_APP_TIMEZONE ?? "Asia/Seoul";

// APP_TZ 기준 오늘에서 offsetDays만큼 더한 날짜를 "YYYY.MM.DD"로 반환.
export const formatDateLabel = (offsetDays = 0): string => {
  const target = new Date();
  target.setUTCDate(target.getUTCDate() + offsetDays);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: APP_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  // en-CA는 YYYY-MM-DD를 반환. 점 표기로 통일.
  return fmt.format(target).replace(/-/g, ".");
};
