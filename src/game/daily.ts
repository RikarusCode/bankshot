export function localDateString(date = new Date()): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, "0");
  const day = `${date.getDate()}`.padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function displayDate(dateString: string): string {
  const [year, month, day] = dateString.split("-");
  return `${Number(month)}/${Number(day)}/${year.slice(2)}`;
}
