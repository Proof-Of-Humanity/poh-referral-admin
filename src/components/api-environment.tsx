import { discardAtlasToken } from '../auth/admin-session';
import {
  apiEnvironment,
  apiEnvironmentLabels,
  rememberApiEnvironment,
  selectableApiEnvironments,
  type ApiEnvironmentName,
} from '../config/env';

import { Badge } from './badge';
import { Select } from './select';

// Reloading is what swaps the endpoint: the GraphQL client and wagmi config are built once at module load.
// The session goes with it, because a JWT issued by one environment is rejected by the others.
const switchTo = (name: ApiEnvironmentName) => {
  if (name === apiEnvironment) return;
  rememberApiEnvironment(name);
  discardAtlasToken();
  window.location.reload();
};

export const ApiEnvironmentSelect = ({ className, compact = false }: { className?: string; compact?: boolean }) => (
  <span className={`${compact ? 'flex items-center gap-2' : 'flex flex-col items-start gap-2'} ${className ?? ''}`}>
    <Select
      aria-label="API environment"
      value={apiEnvironment}
      onChange={(event) => switchTo(event.target.value as ApiEnvironmentName)}
      compact={compact}
    >
      {selectableApiEnvironments.map((name) => (
        <option key={name} value={name}>
          {apiEnvironmentLabels[name]}
        </option>
      ))}
    </Select>
    {apiEnvironment === 'production' && <Badge tone="danger">Live data</Badge>}
  </span>
);
