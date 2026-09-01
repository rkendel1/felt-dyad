/**
 * Simplification Summary Component
 *
 * Displays the complexity reduction and state plumbing removal
 * that FeltDB conversion will provide.
 */

import React from "react";
import type { SimplificationAnalysis } from "@/ipc/types/conversion-analysis";

interface SimplificationSummaryProps {
  simplification: SimplificationAnalysis;
}

export const SimplificationSummary: React.FC<SimplificationSummaryProps> = ({
  simplification,
}) => {
  const complexity = simplification.complexity;
  const formatLOC = (num: number) => num.toLocaleString();
  const categoryRemovals = simplification.categoryRemovals.filter(
    (removal) => Number(removal.current) > 0,
  );
  const reductionPercent = Math.round(complexity.estimatedReductionPercent);
  const netReduction = simplification.netEstimatedReduction;

  return (
    <div className="space-y-6 p-6 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-lg border border-emerald-200">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-xl font-semibold text-emerald-900">
            Estimated Simplification
          </h3>
          <p className="text-sm text-emerald-700 mt-1">
            Based on static code analysis
          </p>
        </div>
        <div className="text-right">
          <div className="text-3xl font-bold text-emerald-600">
            {reductionPercent > 0 ? `-${reductionPercent}%` : "0%"}
          </div>
          <p className="text-xs text-emerald-600 mt-1">code reduction</p>
        </div>
      </div>

      {/* Current vs Estimated */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-white rounded-lg p-4 border border-emerald-100">
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
            Current LOC
          </p>
          <p className="text-2xl font-bold text-gray-900 mt-1">
            {formatLOC(complexity.currentLOC)}
          </p>
        </div>
        <div className="bg-emerald-100 rounded-lg p-4 border border-emerald-200">
          <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide">
            Estimated After
          </p>
          <p className="text-2xl font-bold text-emerald-900 mt-1">
            {formatLOC(simplification.estimatedAfterLOC.low)}-
            {formatLOC(simplification.estimatedAfterLOC.high)}
          </p>
        </div>
      </div>

      {/* LOC Breakdown */}
      <div className="bg-white rounded-lg p-4 border border-emerald-100">
        <h4 className="text-sm font-semibold text-gray-900 mb-3">
          Code Classification
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">
              Removable LOC (API plumbing, sync logic)
            </span>
            <span className="font-semibold text-red-600">
              {formatLOC(complexity.removableLOC)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">
              Replaceable LOC (will be replaced by FeltDB)
            </span>
            <span className="font-semibold text-orange-600">
              {formatLOC(complexity.replaceableLOC)}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-700">Unchanged LOC</span>
            <span className="font-semibold text-gray-600">
              {formatLOC(complexity.unchangedLOC)}
            </span>
          </div>
        </div>
        <div className="mt-3 pt-3 border-t border-gray-200 flex justify-between items-center">
          <span className="text-sm font-semibold text-emerald-900">
            New FeltDB code
          </span>
          <span className="font-semibold text-emerald-600">
            +{formatLOC(simplification.newFeltDBCode)}
          </span>
        </div>
        <div className="mt-2 flex justify-between items-center bg-emerald-50 p-2 rounded">
          <span className="text-sm font-semibold text-emerald-900">
            {netReduction >= 0
              ? "Net estimated reduction"
              : "Net estimated increase"}
          </span>
          <span className="font-bold text-emerald-700">
            ~{formatLOC(Math.abs(netReduction))} LOC
          </span>
        </div>
      </div>

      {/* Complexity Removals */}
      {categoryRemovals.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-emerald-100">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            Complexity Removed by Category
          </h4>
          <div className="space-y-2">
            {categoryRemovals.map((removal, idx) => (
              <div key={idx} className="flex justify-between items-center">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-700">
                    {removal.category}
                  </span>
                  <span className="text-xs text-gray-500">
                    ({removal.unit})
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">
                    {removal.current} → {removal.estimated}
                  </span>
                  <span
                    className={`text-sm font-semibold ${
                      removal.changePercent < -50
                        ? "text-emerald-600"
                        : "text-orange-600"
                    }`}
                  >
                    {removal.changePercent}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* State Plumbing Flows */}
      {simplification.statePlumbingFlows.length > 0 && (
        <div className="bg-white rounded-lg p-4 border border-emerald-100">
          <h4 className="text-sm font-semibold text-gray-900 mb-3">
            State Plumbing Flows
          </h4>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <p className="text-2xl font-bold text-emerald-600">
                {simplification.flowStats.canBeEliminated}
              </p>
              <p className="text-xs text-gray-600">Can be eliminated</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-orange-600">
                {simplification.flowStats.canBeConsolidated}
              </p>
              <p className="text-xs text-gray-600">Can be consolidated</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-gray-600">
                {simplification.flowStats.shouldRemain}
              </p>
              <p className="text-xs text-gray-600">Should remain</p>
            </div>
          </div>
          <p className="text-xs text-gray-600">
            State plumbing: API request → loading state → fetch → setState →
            cache → refetch cycle
          </p>
        </div>
      )}

      {/* New FeltDB Concepts */}
      {simplification.newConcepts.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
          <h4 className="text-sm font-semibold text-blue-900 mb-2">
            New Application Concepts
          </h4>
          <ul className="space-y-1">
            {simplification.newConcepts.map((concept, idx) => (
              <li key={idx} className="text-sm text-blue-800">
                • {concept}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Disclaimer */}
      <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
        <p className="text-xs text-gray-600">
          <span className="font-semibold">Note:</span> These are estimates based
          on detected source code. Actual results will be measured after
          conversion.
        </p>
      </div>
    </div>
  );
};
