import { convert2Seconds } from "./date-time-helper";

export const enum UnitTime {
  HOUR = "HOUR",
  DATE = "DATE",
  MONTH = "MONTH",
}
export const BID_LIFETIME_OPTIONS_UI = [
  { value: convert2Seconds(1, UnitTime.HOUR), label: "1h" },
  { value: convert2Seconds(2, UnitTime.HOUR), label: "2h" },
  { value: convert2Seconds(4, UnitTime.HOUR), label: "4h" },
  { value: convert2Seconds(1, UnitTime.DATE), label: "1day" },
  { value: convert2Seconds(3, UnitTime.DATE), label: "3day" },
  { value: convert2Seconds(7, UnitTime.DATE), label: "7day" },
  { value: convert2Seconds(1, UnitTime.MONTH), label: "1month" },
];

export const enum BID_OPTIONS {
  FIXED = "FIXED",
  BELOW_PERCENT = "BELOW_PERCENT",
  ABOVE_PERCENT = "ABOVE_PERCENT",
}

export const BID_OPTIONS_UI = [
  { value: BID_OPTIONS.BELOW_PERCENT, label: "Below % Floor" },
  { value: BID_OPTIONS.ABOVE_PERCENT, label: "Above % Floor" },
  { value: BID_OPTIONS.FIXED, label: "Fixed" },
];
