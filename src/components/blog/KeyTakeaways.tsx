import React from 'react';
import { motion } from 'framer-motion';
import { Zap } from 'lucide-react';

interface KeyTakeawaysProps {
  items: string[];
}

const KeyTakeaways: React.FC<KeyTakeawaysProps> = ({ items }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.05 }}
      className="my-8 rounded-xl border border-blue-200 bg-blue-50/60 overflow-hidden"
    >
      <div className="flex items-center gap-2.5 px-5 py-3.5 bg-blue-600 text-white">
        <Zap className="w-4 h-4 flex-shrink-0" strokeWidth={2.5} />
        <span className="text-sm font-bold uppercase tracking-wider">Key Takeaways</span>
      </div>
      <ul className="px-5 py-4 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-gray-800 text-sm leading-relaxed">
            <span className="flex-shrink-0 mt-0.5 w-5 h-5 rounded-full bg-blue-100 border border-blue-300 flex items-center justify-center text-blue-700 font-bold text-xs">
              {i + 1}
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </motion.div>
  );
};

export default KeyTakeaways;
