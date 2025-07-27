// Custom plugin to handle missing react-internal rules
export default {
  rules: {
    'safe-string-coercion': {
      meta: {
        type: 'problem',
        docs: {
          description: 'React internal safe string coercion rule',
          category: 'Possible Errors',
        },
        schema: [],
      },
      create(context) {
        return {
          // No-op rule for compatibility
        };
      },
    },
  },
};