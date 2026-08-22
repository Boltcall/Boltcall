import React, { useState } from 'react';
import { updateMetaDescription } from '../lib/utils';
import { motion } from 'framer-motion';
import GiftCard from '../components/ui/gift-card';
import { ShoppingCart, Sparkles, Gift, ArrowRight, X } from 'lucide-react';

const GiftCardPage: React.FC = () => {
  const [selectedCards, setSelectedCards] = useState<number[]>([]);
  const [showCheckout, setShowCheckout] = useState(false);
  const [recipientEmails, setRecipientEmails] = useState(['', '']);

  React.useEffect(() => {
    document.title = 'Gift Cards - Give the Gift of Speed-to-Lead';
    updateMetaDescription('Buy Boltcall gift cards. Give the gift of speed-to-lead answering services. Perfect gift for business owners. Purchase now.');
  }, []);

  const cardValue = 997;
  const discount = 0.90;
  const finalPrice = cardValue * (1 - discount);

  const handleCardSelect = (index: number) => {
    if (selectedCards.includes(index)) {
      setSelectedCards(selectedCards.filter(i => i !== index));
    } else if (selectedCards.length < 2) {
      setSelectedCards([...selectedCards, index]);
    }
  };

  const handlePurchase = () => {
    if (selectedCards.length === 2 && recipientEmails[0] && recipientEmails[1]) {
      // Handle purchase logic here
      // TODO: implement purchase logic
      setShowCheckout(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-black to-gray-900">
      <div className="pt-16 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          {/* Hero Section */}
          <motion.div
            className="text-center mb-12"
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-600/20 border border-blue-500/50 px-4 py-2 rounded-full mb-6">
              <Sparkles className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 font-semibold text-sm">BLACK FRIDAY SPECIAL</span>
            </div>
            
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold text-white mb-6 leading-tight">
              Gift Cards at <span className="text-blue-500">90% Off</span>
            </h1>
            
            <p className="text-xl text-gray-300 mb-4 max-w-2xl mx-auto">
              Give the gift of AI-powered business automation. Each card valued at $997, now just ${finalPrice.toFixed(2)}.
            </p>
            
            <p className="text-sm text-gray-400 max-w-xl mx-auto">
              Purchase up to 2 gift cards. You must gift them to others—perfect for sharing with friends, family, or business partners.
            </p>
          </motion.div>

          {/* Pricing Badge */}
          <motion.div
            className="flex items-center justify-center gap-4 mb-12"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="bg-white/10 backdrop-blur-lg border border-white/20 rounded-2xl px-8 py-4">
              <div className="flex items-baseline gap-3">
                <span className="text-gray-400 line-through text-2xl">${cardValue}</span>
                <span className="text-4xl font-bold text-white">${finalPrice.toFixed(2)}</span>
                <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
                  -90%
                </span>
              </div>
            </div>
          </motion.div>

          {/* Gift Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-12 max-w-4xl mx-auto">
            {[0, 1].map((index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3 + index * 0.1 }}
                className="relative"
              >
                <div 
                  className={`relative cursor-pointer transition-all duration-300 ${
                    selectedCards.includes(index) 
                      ? 'ring-4 ring-blue-500 ring-offset-4 ring-offset-gray-900 scale-105' 
                      : 'hover:scale-[1.02]'
                  }`}
                  onClick={() => handleCardSelect(index)}
                >
                  <div className="absolute -top-2 -right-2 z-10">
                    {selectedCards.includes(index) ? (
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                        <X className="w-5 h-5 text-white" />
                      </div>
                    ) : (
                      <div className="w-8 h-8 bg-gray-700 border-2 border-gray-600 rounded-full flex items-center justify-center">
                        <div className="w-4 h-4 bg-gray-600 rounded-full" />
                      </div>
                    )}
                  </div>
                  
                  <div className="scale-75 origin-center">
                    <GiftCard 
                      balance={`$${cardValue.toFixed(2)}`} 
                      variant={index === 0 ? "gradient" : "gold"}
                    />
                  </div>
                  
                  {selectedCards.includes(index) && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="absolute inset-0 flex items-center justify-center bg-blue-600/20 rounded-2xl"
                    >
                      <div className="bg-blue-600 text-white px-4 py-2 rounded-lg font-semibold flex items-center gap-2">
                        <Gift className="w-4 h-4" />
                        Selected
                      </div>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Purchase Button */}
          <motion.div
            className="text-center mb-8"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <button
              onClick={() => setShowCheckout(true)}
              disabled={selectedCards.length !== 2}
              className={`px-8 py-4 rounded-lg font-semibold text-lg transition-all duration-300 flex items-center gap-3 mx-auto ${
                selectedCards.length === 2
                  ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-600/50'
                  : 'bg-gray-800 text-gray-500 cursor-not-allowed'
              }`}
            >
              <ShoppingCart className="w-5 h-5" />
              Purchase {selectedCards.length} Gift Card{selectedCards.length !== 1 ? 's' : ''}
              {selectedCards.length === 2 && (
                <span className="ml-2">(${(finalPrice * 2).toFixed(2)})</span>
              )}
              <ArrowRight className="w-5 h-5" />
            </button>
            
            {selectedCards.length < 2 && (
              <p className="text-gray-400 text-sm mt-4">
                Select {2 - selectedCards.length} more card{2 - selectedCards.length !== 1 ? 's' : ''} to purchase
              </p>
            )}
          </motion.div>

          {/* Terms */}
          <motion.div
            className="text-center text-gray-400 text-sm max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <p className="mb-2">
              ⚠️ You must provide email addresses for the recipients. These gift cards cannot be used by you.
            </p>
            <p>
              Each gift card is valued at ${cardValue} and can be used for any Boltcall service or subscription.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Checkout Modal */}
      {showCheckout && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white border border-gray-300 rounded-2xl p-8 max-w-md w-full -mt-[100px]"
            style={{ 
              width: 'calc(100% + 200px)',
              maxWidth: 'calc(100% + 200px)',
              marginLeft: '-100px',
              marginRight: '-100px'
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Complete Purchase</h2>
              <button
                onClick={() => setShowCheckout(false)}
                className="text-gray-600 hover:text-gray-900"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 mb-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient 1 Email *
                </label>
                <input
                  type="email"
                  value={recipientEmails[0]}
                  onChange={(e) => setRecipientEmails([e.target.value, recipientEmails[1]])}
                  placeholder="friend1@example.com"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Recipient 2 Email *
                </label>
                <input
                  type="email"
                  value={recipientEmails[1]}
                  onChange={(e) => setRecipientEmails([recipientEmails[0], e.target.value])}
                  placeholder="friend2@example.com"
                  className="w-full px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            <div className="bg-gray-100 rounded-lg p-4 mb-6">
              <div className="flex justify-between text-gray-700 mb-2">
                <span>2 Gift Cards × ${finalPrice.toFixed(2)}</span>
                <span>${(finalPrice * 2).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xl font-bold text-gray-900 pt-2 border-t border-gray-300">
                <span>Total</span>
                <span>${(finalPrice * 2).toFixed(2)}</span>
              </div>
            </div>

            <button
              onClick={handlePurchase}
              disabled={!recipientEmails[0] || !recipientEmails[1]}
              className={`w-full py-3 rounded-lg font-semibold transition-colors ${
                recipientEmails[0] && recipientEmails[1]
                  ? 'bg-blue-600 hover:bg-blue-700 text-white'
                  : 'bg-gray-700 text-gray-500 cursor-not-allowed'
              }`}
            >
              Complete Purchase
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default GiftCardPage;
