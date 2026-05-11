import { FEATURED_TOOLS } from '../src/tool-catalog.js';
import { TOOL_ACCESS } from '../src/security-rules.js';

const missing = FEATURED_TOOLS.filter((tool) => TOOL_ACCESS[tool] === undefined);

if (missing.length > 0) {
  console.error(
    JSON.stringify(
      {
        step: 'check-security-rules',
        missingTools: missing,
      },
      null,
      2,
    ),
  );
  process.exit(1);
}

console.log(
  JSON.stringify(
    {
      step: 'check-security-rules',
      checkedTools: FEATURED_TOOLS.length,
      ok: true,
    },
    null,
    2,
  ),
);
