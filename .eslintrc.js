module.exports = {
  "parser" : "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/eslint-recommended",
    "plugin:@typescript-eslint/recommended"
  ],
  "rules": {
    "no-console": 0,
    "array-bracket-spacing": 2,
    "arrow-spacing": 2,
    "camelcase": "off",
    "@typescript-eslint/camelcase": ["error", { "properties": "always" }],
    "comma-style": 2,
    "comma-spacing": ["error", { "before": false, "after": true }],
    "curly": [ 2, "all" ],
    "eol-last": 2,
    "@typescript-eslint/indent": [ "error", 2 ],
    "key-spacing": 2,
    "keyword-spacing": 2,
    "no-trailing-spaces": "error",
    "no-multiple-empty-lines": ["error", { "max": 1 }],
    "object-curly-spacing": [ 2, "always" ],
    "padded-blocks": ["error", "never"],
    "quotes": ["error", "single", { "avoidEscape": true, "allowTemplateLiterals": true }],
    "semi": [ 2, "always" ],
    "space-before-blocks": 2,
    "space-in-parens": 2,
    "space-infix-ops": 2
  }
};