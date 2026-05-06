"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.numericTransformer = void 0;
exports.numericTransformer = {
    to: (value) => value,
    from: (value) => {
        if (value === null || value === undefined)
            return null;
        const parsed = Number(value);
        return Number.isNaN(parsed) ? null : parsed;
    },
};
