import React, { useState } from 'react';
import { motion } from 'framer-motion';
import LazyLottie from './LazyLottie';
import SlidingPanel from './SlidingPanel';

interface CardTableColumn {
  key: string;
  label: string;
  sortable?: boolean;
  width?: string;
}

// Grid tracks (not flex %) so gap-6 is subtracted from available width before
// sizing columns — flex/% + gap always overflows by (columns-1)*24px.
export function columnsToGridTemplate(columns: CardTableColumn[]): string {
  return columns
    .filter(col => col.key !== 'checkbox')
    .map(col => (col.width ? `${parseFloat(col.width)}fr` : '1fr'))
    .join(' ');
}

interface CardTableWithPanelProps {
  columns: CardTableColumn[];
  data: any[];
  renderRow: (item: any, index: number) => React.ReactNode;
  emptyStateText?: string;
  emptyStateAnimation?: string;
  searchPlaceholder?: string;
  filterOptions?: { label: string; value: string }[];
  onAddNew?: () => void;
  addNewText?: string;
  className?: string;
  hideSearch?: boolean;
  // New props for sliding panel
  showAddPanel?: boolean;
  onCloseAddPanel?: () => void;
  addPanelTitle?: string;
  addPanelContent?: React.ReactNode;
  showEditPanel?: boolean;
  onCloseEditPanel?: () => void;
  editPanelTitle?: string;
  editPanelContent?: React.ReactNode;
}

const CardTableWithPanel: React.FC<CardTableWithPanelProps> = ({
  columns,
  data,
  renderRow,
  emptyStateText = "No data available",
  emptyStateAnimation = "/No_Data_Preview.lottie",
  searchPlaceholder = "Search...",
  onAddNew,
  addNewText = "Add New",
  className = "",
  hideSearch = false,
  showAddPanel = false,
  onCloseAddPanel,
  addPanelTitle = "Add New Item",
  addPanelContent,
  showEditPanel = false,
  onCloseEditPanel,
  editPanelTitle = "Edit Item",
  editPanelContent
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortColumn, setSortColumn] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  const filteredData = data.filter(item => {
    const matchesSearch = Object.values(item).some(value => 
      String(value).toLowerCase().includes(searchTerm.toLowerCase())
    );
    return matchesSearch;
  });

  const handleSort = (columnKey: string) => {
    if (sortColumn === columnKey) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(columnKey);
      setSortDirection('asc');
    }
  };

  return (
    <>
      <div className={`${className}`}>
        {/* Top Control Bar */}
        {!hideSearch && (
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4 flex-1">
              {/* Search Input */}
              <div className="relative flex-1 max-w-xs">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
                <input
                  type="text"
                  placeholder={searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="block w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Add New Button */}
              {onAddNew && (
                <button
                  onClick={onAddNew}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                >
                  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  <span className="font-bold">{addNewText}</span>
                </button>
              )}
            </div>
          </div>
        </div>
        )}

        {/* Table Headers - Simple Text (hidden on mobile since rows stack) */}
        {filteredData.length > 0 && (
          <div className="hidden md:block px-6 py-4">
            <div className="grid gap-6" style={{ gridTemplateColumns: columnsToGridTemplate(columns) }}>
              {/* Column headers - match row structure exactly */}
              {columns.filter(col => col.key !== 'checkbox').map((column) => (
                <div
                  key={column.key}
                  className={`flex items-center gap-2 text-sm font-medium text-gray-700 min-w-0 ${
                    column.sortable ? 'cursor-pointer hover:text-gray-900' : ''
                  }`}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  {column.label}
                  {column.sortable && (
                    <svg className="h-3 w-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
                    </svg>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Table Content - Card-based rows */}
        <div className="space-y-3 px-3 md:px-6 pb-4 md:pb-6">
          {filteredData.length > 0 ? (
            filteredData.map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
                className="bg-white rounded-lg border border-gray-200 p-3 md:p-6 shadow-sm hover:shadow-lg hover:border-gray-300 transition-all duration-500 ease-in-out"
              >
                {renderRow(item, index)}
              </motion.div>
            ))
          ) : (
            <div className="pt-6 pb-12 px-12 text-center">
              <div className="flex flex-col items-center justify-center">
                <div className="w-64 h-64 -mb-4">
                  <LazyLottie
                    src={emptyStateAnimation}
                    loop
                    autoplay
                    className="w-full h-full"
                  />
                </div>
                <p className="text-gray-500 mb-4">{emptyStateText}</p>
                {onAddNew && (
                  <button
                    onClick={onAddNew}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    {addNewText}
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Add Panel */}
      {showAddPanel && onCloseAddPanel && (
        <SlidingPanel
          isOpen={showAddPanel}
          onClose={onCloseAddPanel}
          title={addPanelTitle}
          size="lg"
        >
          {addPanelContent}
        </SlidingPanel>
      )}

      {/* Edit Panel */}
      {showEditPanel && onCloseEditPanel && (
        <SlidingPanel
          isOpen={showEditPanel}
          onClose={onCloseEditPanel}
          title={editPanelTitle}
          size="lg"
        >
          {editPanelContent}
        </SlidingPanel>
      )}
    </>
  );
};

export default CardTableWithPanel;
