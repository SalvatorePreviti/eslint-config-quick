const hasPrettier = require('../hasPrettier')

function getPrettierRules() {
  return {
    // The following rules can be used in some cases in prettier.

    curly: 0,
    'lines-around-comment': 0,
    'max-len': 0,
    'no-tabs': 0,
    'no-unexpected-multiline': 0,
    quotes: 0,

    // The rest are rules that you never need to enable when using Prettier.
    'array-bracket-newline': 0,
    'array-bracket-spacing': 0,
    'array-element-newline': 0,
    'arrow-parens': [0, 'as-needed'],
    'arrow-spacing': 0,
    'block-spacing': 0,
    'brace-style': 0,
    'comma-dangle': 0,
    'comma-spacing': 0,
    'comma-style': 0,
    'computed-property-spacing': 0,
    'dot-location': 0,
    'eol-last': 0,
    'func-call-spacing': 0,
    'function-paren-newline': 0,
    'generator-star': 0,
    'generator-star-spacing': 0,
    'implicit-arrow-linebreak': 0,
    indent: 0,
    'indent-legacy': 0,
    'jsx-quotes': 0,
    'key-spacing': 0,
    'keyword-spacing': 0,
    'multiline-ternary': 0,
    'newline-per-chained-call': 0,
    'new-parens': 0,
    'no-arrow-condition': 0,
    'no-comma-dangle': 0,
    'no-extra-parens': 0,
    'no-extra-semi': 0,
    'no-floating-decimal': 0,
    'no-mixed-spaces-and-tabs': 0,
    'no-multi-spaces': 0,
    'no-multiple-empty-lines': 0,
    'no-reserved-keys': 0,
    'no-space-before-semi': 0,
    'no-spaced-func': 0,
    'no-trailing-spaces': 0,
    'no-whitespace-before-property': 0,
    'no-wrap-func': 0,
    'nonblock-statement-body-position': 0,
    'object-curly-newline': 0,
    'object-curly-spacing': 0,
    'object-property-newline': 0,
    'one-var-declaration-per-line': 0,
    'operator-linebreak': 0,
    'padded-blocks': 0,
    'quote-props': 0,
    'rest-spread-spacing': 0,
    semi: 0,
    'semi-spacing': 0,
    'semi-style': 0,
    'space-after-function-name': 0,
    'space-after-keywords': 0,
    'space-before-blocks': 0,
    'space-before-function-paren': 0,
    'space-before-function-parentheses': 0,
    'space-before-keywords': 0,
    'space-in-brackets': 0,
    'space-in-parens': 0,
    'space-infix-ops': 0,
    'space-return-throw-case': 0,
    'space-unary-ops': 0,
    'space-unary-word-ops': 0,
    'switch-colon-spacing': 0,
    'template-curly-spacing': 0,
    'template-tag-spacing': 0,
    'unicode-bom': 0,
    'wrap-iife': 0,
    'wrap-regex': 0,
    'yield-star-spacing': 0
  }
}

function getNonPrettierRules() {
  return {
    curly: [1, 'all'],
    'lines-around-comment': 0,
    'max-len': [1, 250],
    'no-tabs': 2,
    'no-unexpected-multiline': 2,
    quotes: [1, 'single', { avoidEscape: true, allowTemplateLiterals: true }],
    'array-bracket-newline': [0, 'consistent'],
    'array-bracket-spacing': [2, 'never'],
    'array-element-newline': [0, { multiline: true, minItems: 3 }],
    'arrow-parens': [0, 'as-needed'],
    'arrow-spacing': [2, { before: true, after: true }],
    'block-spacing': [1, 'always'],
    'brace-style': [2, '1tbs', { allowSingleLine: true }],
    'comma-dangle': [1, 'never'],
    'comma-spacing': [1, { before: false, after: true }],
    'comma-style': [2, 'last'],
    'computed-property-spacing': [2, 'never'],
    'dot-location': [1, 'property'],
    'eol-last': [1, 'always'],
    'func-call-spacing': [1, 'never'],
    'function-paren-newline': [1, 'consistent'],
    'generator-star-spacing': [2, { before: false, after: true }],
    'implicit-arrow-linebreak': 0,
    indent: [
      1,
      2,
      {
        SwitchCase: 1,
        ArrayExpression: 1,
        ObjectExpression: 1,
        ImportDeclaration: 1,
        MemberExpression: 1,
        VariableDeclarator: 1,
        outerIIFEBody: 1,
        FunctionDeclaration: { parameters: 1, body: 1 },
        FunctionExpression: { parameters: 1, body: 1 },
        CallExpression: { arguments: 1 },
        flatTernaryExpressions: false,
        ignoredNodes: ['JSXElement', 'JSXElement *']
      }
    ],
    'indent-legacy': 0,
    'jsx-quotes': [0, 'prefer-double'],
    'key-spacing': [1, { beforeColon: false, afterColon: true, mode: 'strict' }],
    'keyword-spacing': [
      2,
      {
        before: true,
        after: true,
        overrides: {
          return: {
            after: true
          },
          throw: {
            after: true
          },
          case: {
            after: true
          }
        }
      }
    ],
    'multiline-ternary': [0, 'never'],
    'newline-per-chained-call': [1, { ignoreChainWithDepth: 4 }],
    'new-parens': 2,
    'no-extra-parens': [
      1,
      'all',
      {
        conditionalAssign: true,
        nestedBinaryExpressions: false,
        returnAssign: false,
        ignoreJSX: 'all',
        enforceForArrowConditionals: false
      }
    ],
    'no-extra-semi': 2,
    'no-floating-decimal': 2,
    'no-mixed-spaces-and-tabs': 1,
    'no-multi-spaces': [1, { ignoreEOLComments: false, exceptions: {} }],
    'no-multiple-empty-lines': [1, { max: 2, maxEOF: 1 }],
    'no-spaced-func': 2,
    'no-trailing-spaces': [1, { skipBlankLines: false, ignoreComments: false }],
    'no-whitespace-before-property': 1,
    'nonblock-statement-body-position': [1, 'below'],
    'object-curly-newline': [
      1,
      {
        ObjectExpression: { consistent: true, multiline: true },
        ObjectPattern: { consistent: true, multiline: true }
      }
    ],
    'object-curly-spacing': [2, 'always'],
    'object-property-newline': [2, { allowMultiplePropertiesPerLine: true }],
    'one-var-declaration-per-line': [1, 'always'],
    'operator-linebreak': 0,
    'padded-blocks': [0, { blocks: 'never', classes: 'never', switches: 'never' }],
    'quote-props': [2, 'as-needed', { keywords: false, unnecessary: true, numbers: false }],
    'rest-spread-spacing': [2, 'never'],
    semi: [1, 'never'],
    'semi-spacing': [2, { before: false, after: true }],
    'semi-style': [2, 'last'],
    'space-before-blocks': 2,
    'space-before-function-paren': [1, { anonymous: 'never', named: 'never', asyncArrow: 'always' }],
    'space-in-parens': [1, 'never'],
    'space-infix-ops': 2,
    'space-unary-ops': [2, { words: true, nonwords: false, overrides: {} }],
    'switch-colon-spacing': [1, { after: true, before: false }],
    'template-curly-spacing': 2,
    'template-tag-spacing': [2, 'never'],
    'unicode-bom': [2, 'never'],
    'wrap-iife': [2, 'outside', { functionPrototypeMethods: false }],
    'wrap-regex': 0,
    'yield-star-spacing': [1, 'after']
  }
}

module.exports = {
  rules: hasPrettier() ? getPrettierRules() : getNonPrettierRules()
}
