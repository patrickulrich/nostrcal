import noInlineScript from './no-inline-script.js';
import noPlaceholderComments from './no-placeholder-comments.js';
import requireWebmanifest from './require-webmanifest.js';
import reactInternal from './react-internal.js';

export default {
  rules: {
    'no-inline-script': noInlineScript,
    'no-placeholder-comments': noPlaceholderComments,
    'require-webmanifest': requireWebmanifest,
    'safe-string-coercion': reactInternal.rules['safe-string-coercion'],
  },
};