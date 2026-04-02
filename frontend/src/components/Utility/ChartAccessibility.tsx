import type { ReactNode } from "react";
import styles from "./ChartAccessibility.module.css";

interface DataPoint {
  /** Label for the data point (e.g., date, category) */
  label: string;
  /** Value(s) for the data point - can be single number or object with multiple values */
  value: number | Record<string, number>;
}

interface ChartAccessibilityProps {
  /** Visual chart element (SVG, canvas, or chart library component) */
  children: ReactNode;
  /** Chart title for screen readers */
  title: string;
  /** Chart description/summary for context */
  description?: string;
  /** Data points to display in accessible table */
  data: DataPoint[];
  /** Column headers for multi-value data points */
  valueHeaders?: string[];
  /** Test ID for testing */
  "data-testid"?: string;
}

/**
 * ChartAccessibility wraps visual charts with an accessible data table.
 * The table is visually hidden but available to screen readers.
 * Provides full data access for users who cannot perceive visual charts.
 *
 * @example
 * <ChartAccessibility
 *   title="Weekly Distance Chart"
 *   description="Distance in kilometers by day of the week"
 *   data={[
 *     { label: "Mon", value: 5.2 },
 *     { label: "Tue", value: 3.8 },
 *   ]}
 * >
 *   <LineChart data={chartData} />
 * </ChartAccessibility>
 *
 * @example Multi-value data
 * <ChartAccessibility
 *   title="Distance Comparison"
 *   description="Current vs previous week distance"
 *   data={[
 *     { label: "Mon", value: { current: 5.2, previous: 4.1 } },
 *   ]}
 *   valueHeaders={["Current", "Previous"]}
 * >
 *   <BarChart data={chartData} />
 * </ChartAccessibility>
 *
 * WCAG 2.2 Criteria:
 * - 1.1.1 Non-text Content (Level A) - text alternative for charts
 * - 1.3.1 Info and Relationships (Level A) - semantic table structure
 * - 1.3.2 Meaningful Sequence (Level A) - logical reading order
 * - 2.4.6 Headings and Labels (Level AA) - descriptive labels
 *
 * Nielsen Heuristics:
 * - #6 Recognition over recall - data available without memorization
 * - #10 Help and documentation - context provided for chart understanding
 */
export function ChartAccessibility({
  children,
  title,
  description,
  data,
  valueHeaders,
  "data-testid": testId = "chart-accessibility",
}: ChartAccessibilityProps) {
  // Determine if data has multiple values per point
  const isMultiValue = data.length > 0 && typeof data[0].value === "object";

  // Get value keys for multi-value data
  const valueKeys = isMultiValue && data.length > 0
    ? Object.keys(data[0].value as Record<string, number>)
    : [];

  // Format single value
  const formatValue = (value: number): string => {
    return Number.isFinite(value) ? value.toFixed(1) : "N/A";
  };

  return (
    <div data-testid={testId}>
      {/* Visual chart - visible to all users */}
      <div role="img" aria-labelledby="chart-title" aria-describedby="chart-description">
        {children}
      </div>

      {/* Accessible data table - visually hidden, available to screen readers */}
      <div className={styles.srOnly}>
        <h3 id="chart-title">{title}</h3>
        {description && <p id="chart-description">{description}</p>}

        <table>
          <caption className={styles.srOnly}>
            {title} - Data table representation
          </caption>
          <thead>
            <tr>
              <th scope="col">Label</th>
              {isMultiValue ? (
                valueKeys.map((key, index) => (
                  <th scope="col" key={key}>
                    {valueHeaders?.[index] || key}
                  </th>
                ))
              ) : (
                <th scope="col">Value</th>
              )}
            </tr>
          </thead>
          <tbody>
            {data.map((point, index) => (
              <tr key={index}>
                <th scope="row">{point.label}</th>
                {isMultiValue ? (
                  valueKeys.map((key) => (
                    <td key={key}>
                      {formatValue((point.value as Record<string, number>)[key])}
                    </td>
                  ))
                ) : (
                  <td>{formatValue(point.value as number)}</td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
