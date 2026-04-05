export function serialize(data: any) {
  return JSON.parse(JSON.stringify(data));
}