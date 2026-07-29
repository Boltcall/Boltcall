import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Library, Mic } from 'lucide-react';
import VoiceLibrary from '../../components/dashboard/VoiceLibrary';
import VoiceClone from '../../components/dashboard/VoiceClone';

type Tab = 'library' | 'clone';

const VoiceLibraryPage: React.FC = () => {
  const [tab, setTab] = useState<Tab>('library');

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="flex items-center gap-2 border-b border-gray-200 dark:border-[#1e1e24]"
      >
        <button
          type="button"
          onClick={() => setTab('library')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors duration-200 ease-out ${
            tab === 'library'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Library className="w-4 h-4" />
          Voice Library
        </button>
        <button
          type="button"
          onClick={() => setTab('clone')}
          className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors duration-200 ease-out ${
            tab === 'clone'
              ? 'border-brand-blue text-brand-blue'
              : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
          }`}
        >
          <Mic className="w-4 h-4" />
          Clone My Voice
        </button>
      </motion.div>

      <motion.div
        key={tab}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
        className="bg-white dark:bg-[#111114] rounded-lg border border-gray-200 dark:border-[#1e1e24]"
      >
        {tab === 'library' ? <VoiceLibrary /> : <VoiceClone />}
      </motion.div>
    </div>
  );
};

export default VoiceLibraryPage;
