export function formatRelativeTime(timestamp: string | Date): string {
  const date = typeof timestamp === "string" ? new Date(timestamp) : timestamp;
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  const minute = 60;
  const hour = minute * 60;
  const day = hour * 24;
  const week = day * 7;
  const month = day * 30;
  const year = day * 365;

  if (diffInSeconds < minute) {
    return "Just now";
  } else if (diffInSeconds < hour) {
    const mins = Math.floor(diffInSeconds / minute);
    return `${mins} minute${mins !== 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < day) {
    const hrs = Math.floor(diffInSeconds / hour);
    return `${hrs} hour${hrs !== 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < week) {
    const days = Math.floor(diffInSeconds / day);
    return `${days} day${days !== 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < month) {
    const weeks = Math.floor(diffInSeconds / week);
    return `${weeks} week${weeks !== 1 ? "s" : ""} ago`;
  } else if (diffInSeconds < year) {
    const months = Math.floor(diffInSeconds / month);
    return `${months} month${months !== 1 ? "s" : ""} ago`;
  } else {
    const years = Math.floor(diffInSeconds / year);
    return `${years} year${years !== 1 ? "s" : ""} ago`;
  }
}
