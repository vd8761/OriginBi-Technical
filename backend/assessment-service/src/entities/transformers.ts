export const numericTransformer = {
    to: (value: number | null | undefined) => value,
    from: (value: string | null | undefined) => {
        if (value === null || value === undefined) return null;
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
    },
};
