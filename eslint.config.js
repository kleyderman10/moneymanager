import js from '@eslint/js'
import pluginVue from 'eslint-plugin-vue'
import globals from 'globals'

export default [
  { ignores: ['dist/**', 'android/**', 'ios/**', 'node_modules/**', 'scripts/**', 'public/**'] },
  js.configs.recommended,
  ...pluginVue.configs['flat/essential'],
  {
    languageOptions: { globals: { ...globals.browser, ...globals.node } },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', caughtErrors: 'none' }],
      'vue/multi-word-component-names': 'off',
      'vue/no-mutating-props': 'warn',
      'vue/valid-v-slot': ['error', { allowModifiers: true }],
    },
  },
]
