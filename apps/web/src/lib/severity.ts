import type { Severity } from '@repo/shared';

export const severityConfig: Record<Severity, {
  label: string;
  color: string;
  bgColor: string;
  borderColor: string;
  textColor: string;
}> = {
  critical: {
    label: 'Critical',
    color: 'red',
    bgColor: 'bg-red-100',
    borderColor: 'border-red-300',
    textColor: 'text-red-900',
  },
  high: {
    label: 'High',
    color: 'orange',
    bgColor: 'bg-orange-100',
    borderColor: 'border-orange-300',
    textColor: 'text-orange-900',
  },
  medium: {
    label: 'Medium',
    color: 'yellow',
    bgColor: 'bg-yellow-100',
    borderColor: 'border-yellow-300',
    textColor: 'text-yellow-900',
  },
  low: {
    label: 'Low',
    color: 'blue',
    bgColor: 'bg-blue-100',
    borderColor: 'border-blue-300',
    textColor: 'text-blue-900',
  },
  info: {
    label: 'Info',
    color: 'gray',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
    textColor: 'text-gray-900',
  },
};

export function getSeverityBadgeClasses(severity: Severity): string {
  const config = severityConfig[severity];
  return `${config.bgColor} ${config.textColor} ${config.borderColor} border px-2 py-1 rounded text-xs font-medium`;
}

export function countBySeverity(issues: Array<{ severity: Severity }>): Record<Severity, number> {
  return {
    critical: issues.filter(i => i.severity === 'critical').length,
    high: issues.filter(i => i.severity === 'high').length,
    medium: issues.filter(i => i.severity === 'medium').length,
    low: issues.filter(i => i.severity === 'low').length,
    info: issues.filter(i => i.severity === 'info').length,
  };
}