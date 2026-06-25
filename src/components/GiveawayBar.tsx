import React from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

const GiveawayBar: React.FC = () => {
  const { t } = useTranslation('marketing');
  return (
    <Link to="/giveaway" className="block">
      <div className="bg-blue-600 text-white w-full cursor-pointer shadow-none drop-shadow-none ring-0 border-none outline-none" style={{ contain: 'layout style', boxShadow: 'none' }}>
        <div className="relative z-10">
          <div className="max-w-7xl mx-auto px-2 sm:px-4 lg:px-8">
            <div className="flex items-center justify-center py-1 gap-2 sm:gap-3">
              <div className="flex items-center space-x-1 sm:space-x-3">
                <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-2">
                  <span className="font-bold text-xs sm:text-sm text-white">{t('giveawayBar.breakOurAi')}</span>
                  <span className="text-[10px] sm:text-xs lg:text-sm text-white/80">
                    {t('giveawayBar.crack')} <strong className="text-white">{t('giveawayBar.freeWebsite')}</strong>.
                  </span>
                </div>
              </div>

              <span className="bg-black hover:bg-gray-900 transition-colors text-white text-[10px] sm:text-xs font-bold px-2 sm:px-3 py-0.5 sm:py-1 rounded-lg whitespace-nowrap">
                {t('giveawayBar.tryNow')}
              </span>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
};

export default GiveawayBar;
