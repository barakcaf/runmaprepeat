import type { ReactNode } from "react";
import { VisuallyHidden } from "./VisuallyHidden";

interface ChartAccessibilityProps {
  label: string;
  columns: string[];
  data: (string | number)[][];
  children: ReactNode;
}

export function ChartAccessibility({
  label,
  columns,
  data,
  children,
}: ChartAccessibilityProps) {
  return (
    <div>
      {children}
      <VisuallyHidden as="div">
        <table>
          <caption>{label}</caption>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} scope="col">
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={rowIdx}>
                {row.map((cell, cellIdx) => (
                  <td key={cellIdx}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </VisuallyHidden>
    </div>
  );
}
