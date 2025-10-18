/**
 * MarketChart Component
 *
 * Displays the LMSR market probability over time for YES/NO outcomes.
 * Shows historical price movements throughout the 30-day game period.
 *
 * Features:
 * - Line chart with YES (green) and NO (red) probability lines
 * - X-axis: Game days (1-30)
 * - Y-axis: Probability (0-100%)
 * - Current price indicator
 * - Hover tooltips with exact values
 * - Responsive design (simplified on mobile)
 *
 * @module ui/components/MarketChart
 */

import React, { useState } from 'react';

/**
 * Data point for market price history
 */
export interface PricePoint {
  day: number;
  yesPrice: number;  // 0-1 (converted to percentage for display)
  noPrice: number;   // 0-1 (converted to percentage for display)
  timestamp: Date;
}

/**
 * Props for MarketChart component
 */
export interface MarketChartProps {
  /** Array of historical price points */
  priceHistory: PricePoint[];
  /** Current game day (1-30) */
  currentDay: number;
  /** Current YES price (0-1) */
  currentYesPrice: number;
  /** Current NO price (0-1) */
  currentNoPrice: number;
  /** Loading state */
  isLoading?: boolean;
  /** Chart height in pixels */
  height?: number;
  /** Enable/disable animations */
  animate?: boolean;
}

/**
 * MarketChart Component
 *
 * TODO: Install and integrate a charting library (recommended: recharts or Chart.js)
 * TODO: npm install recharts or npm install chart.js react-chartjs-2
 *
 * LMSR Pricing Reference:
 * Price(YES) = e^(q_yes/b) / (e^(q_yes/b) + e^(q_no/b))
 * Price(NO) = 1 - Price(YES)
 *
 * Where:
 * - q_yes: Outstanding YES shares
 * - q_no: Outstanding NO shares
 * - b: Liquidity parameter
 *
 * Prices are always between 0 and 1, representing probability.
 * Display as percentage (price * 100).
 *
 * @param props - MarketChart component props
 * @returns Rendered market chart
 */
export const MarketChart: React.FC<MarketChartProps> = ({
  priceHistory,
  currentDay,
  currentYesPrice,
  currentNoPrice,
  isLoading = false,
  height = 400,
  animate = true,
}) => {
  const [hoveredPoint, setHoveredPoint] = useState<PricePoint | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  /**
   * Convert price (0-1) to percentage string
   */
  const toPercent = (price: number): string => {
    return `${(price * 100).toFixed(1)}%`;
  };

  /**
   * Handle mouse hover over chart points
   * TODO: Integrate with actual chart library hover events
   */
  const handleHover = (point: PricePoint, event: React.MouseEvent) => {
    setHoveredPoint(point);
    setTooltipPosition({ x: event.clientX, y: event.clientY });
  };

  /**
   * Clear hover state
   */
  const handleMouseLeave = () => {
    setHoveredPoint(null);
  };

  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center bg-gray-800 rounded-lg"
        style={{ height }}
      >
        <div className="animate-pulse text-gray-400">
          Loading chart data...
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Chart Container */}
      <div
        className="bg-gray-800 rounded-lg p-4 border border-gray-700"
        style={{ height }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-white">
            Market Probability Over Time
          </h3>

          {/* Legend */}
          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-gray-300">YES</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-gray-300">NO</span>
            </div>
          </div>
        </div>

        {/* Current Prices */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 bg-green-900/30 border border-green-700 rounded p-2">
            <div className="text-xs text-green-400 mb-1">YES</div>
            <div className="text-2xl font-bold text-green-500">
              {toPercent(currentYesPrice)}
            </div>
          </div>
          <div className="flex-1 bg-red-900/30 border border-red-700 rounded p-2">
            <div className="text-xs text-red-400 mb-1">NO</div>
            <div className="text-2xl font-bold text-red-500">
              {toPercent(currentNoPrice)}
            </div>
          </div>
        </div>

        {/* Chart Area */}
        <div
          className="relative bg-gray-900 rounded border border-gray-700"
          style={{ height: height - 180 }}
          onMouseLeave={handleMouseLeave}
        >
          {/* TODO: Replace this placeholder with actual chart library integration */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <svg
                className="w-16 h-16 mx-auto mb-2"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M7 12l3-3 3 3 4-4M8 21l4-4 4 4M3 4h18M4 4h16v12a1 1 0 01-1 1H5a1 1 0 01-1-1V4z"
                />
              </svg>
              <p className="text-sm">Chart Visualization Here</p>
              <p className="text-xs mt-1">
                TODO: Install recharts or Chart.js
              </p>
              <p className="text-xs text-gray-600 mt-2">
                {priceHistory.length} data points • Day {currentDay}/30
              </p>
            </div>
          </div>

          {/* Grid lines (placeholder) */}
          <svg className="absolute inset-0 w-full h-full opacity-20">
            {/* Horizontal grid lines */}
            {[0, 25, 50, 75, 100].map((percent) => {
              const y = (1 - percent / 100) * 100;
              return (
                <line
                  key={percent}
                  x1="0%"
                  y1={`${y}%`}
                  x2="100%"
                  y2={`${y}%`}
                  stroke="currentColor"
                  strokeWidth="1"
                />
              );
            })}
            {/* Vertical grid lines */}
            {[0, 10, 20, 30].map((day) => {
              const x = (day / 30) * 100;
              return (
                <line
                  key={day}
                  x1={`${x}%`}
                  y1="0%"
                  x2={`${x}%`}
                  y2="100%"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              );
            })}
          </svg>
        </div>

        {/* X-axis label */}
        <div className="flex justify-between text-xs text-gray-500 mt-2 px-2">
          <span>Day 1</span>
          <span>Day 10</span>
          <span>Day 20</span>
          <span>Day 30</span>
        </div>
      </div>

      {/* Hover Tooltip */}
      {hoveredPoint && (
        <div
          className="fixed z-50 bg-gray-900 border border-gray-700 rounded-lg p-3 shadow-xl pointer-events-none"
          style={{
            left: tooltipPosition.x + 10,
            top: tooltipPosition.y - 80,
          }}
        >
          <div className="text-xs text-gray-400 mb-2">
            Day {hoveredPoint.day}
          </div>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm text-green-400">
                YES: {toPercent(hoveredPoint.yesPrice)}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 bg-red-500 rounded-full"></div>
              <span className="text-sm text-red-400">
                NO: {toPercent(hoveredPoint.noPrice)}
              </span>
            </div>
          </div>
          <div className="text-xs text-gray-500 mt-2">
            {hoveredPoint.timestamp.toLocaleTimeString()}
          </div>
        </div>
      )}

      {/* Mobile Simplified View */}
      <div className="md:hidden mt-4 bg-gray-800 rounded-lg p-4 border border-gray-700">
        <h4 className="text-sm font-semibold text-white mb-2">
          Recent Price History
        </h4>
        <div className="space-y-2">
          {priceHistory.slice(-5).map((point, idx) => (
            <div
              key={idx}
              className="flex justify-between text-sm"
            >
              <span className="text-gray-400">Day {point.day}</span>
              <div className="flex gap-3">
                <span className="text-green-400">{toPercent(point.yesPrice)}</span>
                <span className="text-red-400">{toPercent(point.noPrice)}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default MarketChart;
