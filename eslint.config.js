// @ts-check

import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

export default tseslint.config(eslint.configs.all, ...tseslint.configs.strict, ...tseslint.configs.stylistic, {
    languageOptions: {
        ecmaVersion: 'latest',
        globals: { ...globals.browser }
    }
});
