export function getErrorMessage(e: unknown): string {
    if (e instanceof Error) {
        return e.stack ?? e.message;
    }

    if (typeof e === 'string') {
        return e;
    }

    return JSON.stringify(e);
}
