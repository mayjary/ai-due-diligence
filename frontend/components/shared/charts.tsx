'use client';

import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { FinancialDataPoint } from '@/lib/types';

const axisStyle = { fontSize: 11, fill: 'hsl(215 14% 55%)' };

function formatCurrency(value: number) {
  if (value >= 1000) return `$${(value / 1000).toFixed(1)}T`;
  return `$${value.toFixed(1)}B`;
}

interface RevenueChartProps {
  data: FinancialDataPoint[];
  height?: number;
}

export function RevenueChart({ data, height = 220 }: RevenueChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="revGradient" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--chart-1))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--chart-1))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCurrency} tick={axisStyle} axisLine={false} tickLine={false} width={50} />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), 'Revenue']}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="hsl(var(--chart-1))"
          strokeWidth={2}
          fill="url(#revGradient)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface OperatingIncomeChartProps {
  data: FinancialDataPoint[];
  height?: number;
}

export function OperatingIncomeChart({ data, height = 220 }: OperatingIncomeChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCurrency} tick={axisStyle} axisLine={false} tickLine={false} width={50} />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), 'Operating Income']}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="operatingIncome" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface CashFlowChartProps {
  data: FinancialDataPoint[];
  height?: number;
}

export function CashFlowChart({ data, height = 220 }: CashFlowChartProps) {
  const chartData = data.map((d) => ({
    year: d.year,
    'Operating Cash Flow': d.operatingCashFlow,
    'Free Cash Flow': d.freeCashFlow,
    Capex: d.capex,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCurrency} tick={axisStyle} axisLine={false} tickLine={false} width={50} />
        <Tooltip
          formatter={(value: number) => formatCurrency(value)}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="Operating Cash Flow" fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Free Cash Flow" fill="hsl(var(--chart-2))" radius={[3, 3, 0, 0]} />
        <Bar dataKey="Capex" fill="hsl(var(--chart-3))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface MarginChartProps {
  data: FinancialDataPoint[];
  height?: number;
}

export function MarginChart({ data, height = 220 }: MarginChartProps) {
  const chartData = data.map((d) => ({
    year: d.year,
    'Gross Margin': d.grossMargin,
    'Operating Margin': d.operatingMargin,
    'Net Margin': d.netMargin,
  }));
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={(v: number) => `${v.toFixed(0)}%`} tick={axisStyle} axisLine={false} tickLine={false} width={40} />
        <Tooltip
          formatter={(value: number) => `${value.toFixed(1)}%`}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        />
        <Line type="monotone" dataKey="Gross Margin" stroke="hsl(var(--chart-1))" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="Operating Margin" stroke="hsl(var(--chart-2))" strokeWidth={2} dot={{ r: 3 }} />
        <Line type="monotone" dataKey="Net Margin" stroke="hsl(var(--chart-5))" strokeWidth={2} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface SegmentChartProps {
  data: { name: string; revenue: number; share: number }[];
  height?: number;
}

const segmentColors = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

export function SegmentChart({ data, height = 220 }: SegmentChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 10, left: 80, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
        <XAxis type="number" tickFormatter={formatCurrency} tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis type="category" dataKey="name" tick={axisStyle} axisLine={false} tickLine={false} width={80} />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), 'Revenue']}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="revenue" radius={[0, 3, 3, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={segmentColors[index % segmentColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface GeographicChartProps {
  data: { region: string; revenue: number; share: number }[];
  height?: number;
}

export function GeographicChart({ data, height = 220 }: GeographicChartProps) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="region" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatCurrency} tick={axisStyle} axisLine={false} tickLine={false} width={50} />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), 'Revenue']}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="revenue" radius={[3, 3, 0, 0]}>
          {data.map((_, index) => (
            <Cell key={index} fill={segmentColors[index % segmentColors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

interface SimpleAreaChartProps {
  data: { year: number; value: number }[];
  height?: number;
  color?: string;
  label?: string;
  format?: 'currency' | 'percentage';
}

export function SimpleAreaChart({ data, height = 200, color, label, format = 'currency' }: SimpleAreaChartProps) {
  const chartColor = color || 'hsl(var(--chart-1))';
  const gradientId = `gradient-${label || 'data'}`.replace(/\s/g, '-').toLowerCase();
  const formatter = format === 'percentage'
    ? (v: number) => `${v.toFixed(1)}%`
    : formatCurrency;

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor={chartColor} stopOpacity={0.3} />
            <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="year" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatter} tick={axisStyle} axisLine={false} tickLine={false} width={50} />
        <Tooltip
          formatter={(value: number) => [formatter(value), label || 'Value']}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        />
        <Area type="monotone" dataKey="value" stroke={chartColor} strokeWidth={2} fill={`url(#${gradientId})`} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

interface ComparisonBarChartProps {
  data: { label: string; companyA: number; companyB: number }[];
  height?: number;
  labelA?: string;
  labelB?: string;
  format?: 'currency' | 'percentage' | 'number';
}

export function ComparisonBarChart({ data, height = 300, labelA = 'Company A', labelB = 'Company B', format = 'currency' }: ComparisonBarChartProps) {
  const formatter = format === 'percentage'
    ? (v: number) => `${v.toFixed(1)}%`
    : format === 'currency'
    ? formatCurrency
    : (v: number) => v.toFixed(1);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} />
        <XAxis dataKey="label" tick={axisStyle} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={formatter} tick={axisStyle} axisLine={false} tickLine={false} width={50} />
        <Tooltip
          formatter={(value: number) => formatter(value)}
          contentStyle={{
            backgroundColor: 'hsl(var(--popover))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '6px',
            fontSize: '12px',
          }}
        />
        <Bar dataKey="companyA" name={labelA} fill="hsl(var(--chart-1))" radius={[3, 3, 0, 0]} />
        <Bar dataKey="companyB" name={labelB} fill="hsl(var(--chart-4))" radius={[3, 3, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
