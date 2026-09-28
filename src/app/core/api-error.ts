/** Maps the mock API's Error messages to text the components render. */
export function toUserMessage(err: unknown, fallback: string): string {
  const message = err instanceof Error ? err.message : '';
  switch (message) {
    case 'Network error':
      return `${fallback} The server could not be reached. Check your connection and try again.`;
    case 'Not found':
      return 'This change request does not exist or is not in your organisation.';
    case '':
      return `${fallback} Something unexpected went wrong.`;
    default:
      return `${fallback} ${message}`;
  }
}
