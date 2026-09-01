/**
 * Simplification Details Component
 *
 * Shows detailed breakdown of state plumbing flows and complexity metrics.
 */

import React from "react";
import type { SimplificationAnalysis } from "@/ipc/types/conversion-analysis";

interface SimplificationDetailsProps {
  simplification: SimplificationAnalysis;
}

export const SimplificationDetails: React.FC<SimplificationDetailsProps> = ({
  simplification,
}) => {
  const [expandedFlow, setExpandedFlow] = React.useState<number | null>(null);

  return (
    <div className="space-y-6">
      {/* State Plumbing Flows */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          State Plumbing Flows
        </h3>
        <p className="text-sm text-gray-600 mb-4">
          These are patterns in your application that handle state
          synchronization. FeltDB can simplify or eliminate many of these.
        </p>

        <div className="space-y-3">
          {simplification.statePlumbingFlows.map((flow, idx) => (
            <div
              key={idx}
              className={`border rounded-lg transition-colors ${
                flow.canBeEliminated
                  ? "border-emerald-200 bg-emerald-50"
                  : flow.canBeConsolidated
                    ? "border-orange-200 bg-orange-50"
                    : "border-gray-200 bg-gray-50"
              }`}
            >
              <button
                onClick={() =>
                  setExpandedFlow(expandedFlow === idx ? null : idx)
                }
                className="w-full p-4 text-left flex items-start gap-3 hover:opacity-75 transition-opacity"
              >
                <div className="flex-shrink-0 mt-1">
                  {flow.canBeEliminated && (
                    <div className="w-6 h-6 rounded-full bg-emerald-500 flex items-center justify-center text-white text-xs font-bold">
                      ✓
                    </div>
                  )}
                  {flow.canBeConsolidated && !flow.canBeEliminated && (
                    <div className="w-6 h-6 rounded-full bg-orange-500 flex items-center justify-center text-white text-xs font-bold">
                      ~
                    </div>
                  )}
                  {!flow.canBeEliminated && !flow.canBeConsolidated && (
                    <div className="w-6 h-6 rounded-full bg-gray-400 flex items-center justify-center text-white text-xs font-bold">
                      -
                    </div>
                  )}
                </div>
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {flow.description}
                  </p>
                  <p className="text-xs text-gray-600 mt-1">
                    {flow.canBeEliminated && "Can be eliminated"}
                    {flow.canBeConsolidated &&
                      !flow.canBeEliminated &&
                      "Can be consolidated"}
                    {flow.requiresReview && "Requires review"}
                    {!flow.requiresReview &&
                      !flow.canBeEliminated &&
                      !flow.canBeConsolidated &&
                      "Should remain external"}
                  </p>
                </div>
                <svg
                  className={`w-4 h-4 text-gray-400 transition-transform ${
                    expandedFlow === idx ? "rotate-180" : ""
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M19 14l-7 7m0 0l-7-7m7 7V3"
                  />
                </svg>
              </button>

              {expandedFlow === idx && (
                <div className="px-4 pb-4 border-t border-current border-opacity-20">
                  <p className="text-sm font-semibold text-gray-700 mb-2">
                    Current steps:
                  </p>
                  <ol className="space-y-1">
                    {flow.steps.map((step, stepIdx) => (
                      <li
                        key={stepIdx}
                        className="text-sm text-gray-600 flex items-start gap-2"
                      >
                        <span className="text-xs text-gray-400 font-mono">
                          {stepIdx + 1}.
                        </span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                  <div className="mt-3 p-2 bg-white bg-opacity-50 rounded text-xs text-gray-600">
                    {flow.canBeEliminated && (
                      <p>
                        <span className="font-semibold text-emerald-700">
                          Eliminated by:
                        </span>{" "}
                        FeltDB reactive query automatically handles all steps
                      </p>
                    )}
                    {flow.canBeConsolidated && !flow.canBeEliminated && (
                      <p>
                        <span className="font-semibold text-orange-700">
                          Consolidated to:
                        </span>{" "}
                        FeltDB mutation + server action combination
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* Complexity Comparison Table */}
      <section className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Complexity Comparison
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200">
                <th className="text-left py-2 px-3 font-semibold text-gray-900">
                  Category
                </th>
                <th className="text-center py-2 px-3 font-semibold text-gray-900">
                  Current
                </th>
                <th className="text-center py-2 px-3 font-semibold text-gray-900">
                  Estimated
                </th>
                <th className="text-right py-2 px-3 font-semibold text-gray-900">
                  Change
                </th>
              </tr>
            </thead>
            <tbody>
              {simplification.categoryRemovals.map((removal, idx) => (
                <tr
                  key={idx}
                  className={idx % 2 === 0 ? "bg-gray-50" : "bg-white"}
                >
                  <td className="py-2 px-3 text-gray-700">
                    {removal.category}
                  </td>
                  <td className="py-2 px-3 text-center text-gray-600">
                    {removal.current} {removal.unit}
                  </td>
                  <td className="py-2 px-3 text-center text-gray-600">
                    {removal.estimated} {removal.unit}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <span
                      className={`font-semibold ${
                        removal.changePercent < 0
                          ? "text-emerald-600"
                          : "text-gray-600"
                      }`}
                    >
                      {removal.changePercent < 0 ? "" : "+"}
                      {removal.changePercent}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Tradeoffs */}
      {simplification.locEstimateAvailable === true && (
        <section className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Tradeoffs
          </h3>
          <div className="space-y-4">
            <div className="bg-red-50 border border-red-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-red-900 mb-1">
                Code That Will Be Removed
              </p>
              <p className="text-sm text-red-800">
                ~{simplification.complexity.removableLOC.toLocaleString()} LOC
              </p>
              <p className="text-xs text-red-700 mt-1">
                API client code, database plumbing, sync logic, cache handling
              </p>
            </div>

            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-orange-900 mb-1">
                Code That Will Be Replaced
              </p>
              <p className="text-sm text-orange-800">
                ~{simplification.complexity.replaceableLOC.toLocaleString()} LOC
              </p>
              <p className="text-xs text-orange-700 mt-1">
                React state management, context providers, store setup, loading
                state handling
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-blue-900 mb-1">
                New Code to Add
              </p>
              <p className="text-sm text-blue-800">
                +{simplification.newFeltDBCode.toLocaleString()} LOC
              </p>
              <p className="text-xs text-blue-700 mt-1">
                FeltDB schema, query hooks, sync configuration, server actions
              </p>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm font-semibold text-emerald-900 mb-1">
                Net Reduction
              </p>
              <p className="text-sm text-emerald-800">
                ~{simplification.netEstimatedReduction.toLocaleString()} LOC
              </p>
              <p className="text-xs text-emerald-700 mt-1">
                {Math.round(
                  (simplification.netEstimatedReduction /
                    simplification.complexity.currentLOC) *
                    100,
                )}
                % of current application size
              </p>
            </div>
          </div>
        </section>
      )}

      {/* Disclaimer */}
      <section className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <p className="text-xs text-yellow-800">
          Static analysis reports detected routes, state sources, and affected
          files. LOC reduction is measured only after an approved conversion is
          applied.
        </p>
      </section>
    </div>
  );
};
