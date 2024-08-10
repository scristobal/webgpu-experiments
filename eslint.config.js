// @ts-check

import eslint from '@eslint/js';
import globals from 'globals';
import tsParser from '@typescript-eslint/parser';
import tseslint from 'typescript-eslint';

export default tseslint.config(eslint.configs.all, ...tseslint.configs.all, {
    languageOptions: {
        ecmaVersion: 'latest',
        globals: { ...globals.browser },
        parser: tsParser,
        parserOptions: { project: ['./tsconfig.json'] }
    }
});
