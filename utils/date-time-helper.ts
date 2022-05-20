import { UnitTime } from "./clientConstant";

export const convert2Seconds = (duration: number, unit: UnitTime) => {
  switch (unit) {
    case UnitTime.HOUR:
      return duration * 3600;
    case UnitTime.DATE:
      return duration * 3600 * 24;
    case UnitTime.MONTH:
      return duration * 3600 * 24 * 30;
    default:
      return 0;
  }
};
