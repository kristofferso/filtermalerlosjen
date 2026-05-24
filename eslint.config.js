//  @ts-check

import { tanstackConfig } from "@tanstack/eslint-config"

export default [
  {
    ignores: [".agents/**", ".output/**", "node_modules/**"],
  },
  ...tanstackConfig,
]
