import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import {
  Plus,
  Trash2,
  Edit2,
  Search,
  ChevronDown,
  Package,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";

interface DataRecord {
  id: string | number;
  [key: string]: unknown;
}

interface DataCollection {
  name: string;
  displayName: string;
  count: number;
  fields: Array<{
    name: string;
    type: "string" | "number" | "boolean" | "date";
  }>;
  records?: DataRecord[];
}

interface DataPanelProps {
  collections?: DataCollection[];
  onAddRecord?: (collection: string) => Promise<void>;
  onDeleteRecord?: (
    collection: string,
    recordId: string | number,
  ) => Promise<void>;
  onEditRecord?: (collection: string, record: DataRecord) => Promise<void>;
}

export function DataPanel({
  collections = [],
  onAddRecord,
  onDeleteRecord,
  onEditRecord,
}: DataPanelProps) {
  const [expandedCollection, setExpandedCollection] = useState<string | null>(
    null,
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  // Filter collections by search
  const filteredCollections = useMemo(
    () =>
      collections.filter((col) =>
        col.displayName.toLowerCase().includes(searchQuery.toLowerCase()),
      ),
    [collections, searchQuery],
  );

  const handleAddRecord = async (collectionName: string) => {
    if (!onAddRecord) return;
    setIsLoading(true);
    try {
      await onAddRecord(collectionName);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteRecord = async (
    collectionName: string,
    recordId: string | number,
  ) => {
    if (!onDeleteRecord) return;
    setIsLoading(true);
    try {
      await onDeleteRecord(collectionName, recordId);
    } finally {
      setIsLoading(false);
    }
  };

  if (collections.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-8">
        <Package className="w-12 h-12 text-gray-400 dark:text-gray-600 mb-4" />
        <h3 className="text-lg font-semibold text-gray-700 dark:text-gray-300 mb-2">
          No data yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your application data will appear here when you start building.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b border-gray-200 dark:border-gray-800 p-4">
        <h2 className="text-lg font-semibold mb-3">Data</h2>
        <Input
          placeholder="Search collections..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="text-sm"
          icon={<Search className="w-4 h-4" />}
        />
      </div>

      {/* Collections */}
      <div className="flex-1 overflow-y-auto">
        <div className="space-y-2 p-4">
          {filteredCollections.map((collection) => (
            <div key={collection.name} className="space-y-2">
              {/* Collection Header */}
              <button
                onClick={() =>
                  setExpandedCollection(
                    expandedCollection === collection.name
                      ? null
                      : collection.name,
                  )
                }
                className="w-full flex items-center justify-between p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <div className="w-8 h-8 rounded bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                    <Package className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <div className="text-left min-w-0">
                    <p className="font-medium text-sm">
                      {collection.displayName}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      {collection.count} record
                      {collection.count !== 1 ? "s" : ""}
                    </p>
                  </div>
                </div>
                <ChevronDown
                  className={cn(
                    "w-4 h-4 text-gray-400 transition-transform flex-shrink-0",
                    expandedCollection === collection.name && "rotate-180",
                  )}
                />
              </button>

              {/* Collection Details */}
              {expandedCollection === collection.name && (
                <div className="ml-4 p-3 rounded-lg bg-gray-50 dark:bg-gray-900/50 space-y-3">
                  {/* Fields */}
                  <div>
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                      Fields
                    </p>
                    <div className="space-y-1">
                      {collection.fields.map((field) => (
                        <div
                          key={field.name}
                          className="flex items-center justify-between text-xs"
                        >
                          <span className="font-mono text-gray-700 dark:text-gray-300">
                            {field.name}
                          </span>
                          <span className="px-2 py-0.5 bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded text-xs">
                            {field.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Records Preview */}
                  {collection.records && collection.records.length > 0 && (
                    <div>
                      <p className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-2">
                        Recent Records
                      </p>
                      <div className="space-y-1 max-h-40 overflow-y-auto">
                        {collection.records.slice(0, 3).map((record) => (
                          <div
                            key={record.id}
                            className="flex items-center justify-between p-2 bg-white dark:bg-gray-800 rounded text-xs"
                          >
                            <span className="truncate text-gray-700 dark:text-gray-300 flex-1">
                              {String(record.id)}
                            </span>
                            <div className="flex gap-1">
                              <button
                                onClick={() =>
                                  onEditRecord?.(collection.name, record)
                                }
                                className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                              >
                                <Edit2 className="w-3 h-3 text-gray-500" />
                              </button>
                              <button
                                onClick={() =>
                                  handleDeleteRecord(collection.name, record.id)
                                }
                                className="p-1 hover:bg-red-100 dark:hover:bg-red-900/30 rounded"
                                disabled={isLoading}
                              >
                                <Trash2 className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                      {collection.records.length > 3 && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          +{collection.records.length - 3} more
                        </p>
                      )}
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="flex gap-2 pt-2">
                    <Button
                      size="sm"
                      className="flex-1 text-xs"
                      onClick={() => handleAddRecord(collection.name)}
                      disabled={isLoading}
                    >
                      <Plus className="w-3 h-3 mr-1" />
                      Add Record
                    </Button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
