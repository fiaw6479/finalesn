import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, Gift, Sparkles, CheckCircle, QrCode, Clock, 
  User, Crown, Award, ChefHat, Copy, Check, Share2,
  AlertTriangle, Loader2, Star
} from 'lucide-react';

interface Reward {
  id: string;
  name: string;
  description?: string;
  points_required: number;
  category: string;
  min_tier: 'bronze' | 'silver' | 'gold';
}

interface Customer {
  id: string;
  first_name: string;
  last_name: string;
  current_tier: 'bronze' | 'silver' | 'gold';
  total_points: number;
}

interface Restaurant {
  id: string;
  name: string;
  slug: string;
}

interface CustomerRedemptionModalProps {
  reward: Reward;
  customer: Customer;
  restaurant: Restaurant;
  onConfirm: () => Promise<void>;
  onClose: () => void;
}

const CustomerRedemptionModal: React.FC<CustomerRedemptionModalProps> = ({
  reward,
  customer,
  restaurant,
  onConfirm,
  onClose
}) => {
  const [step, setStep] = useState<'confirm' | 'processing' | 'qr' | 'complete'>('confirm');
  const [redemptionCode, setRedemptionCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);

  const getTierInfo = (tier: string) => {
    switch (tier) {
      case 'gold':
        return { name: 'Gold', icon: Crown, color: 'text-yellow-600' };
      case 'silver':
        return { name: 'Silver', icon: Award, color: 'text-gray-600' };
      default:
        return { name: 'Bronze', icon: ChefHat, color: 'text-orange-600' };
    }
  };

  const tierInfo = getTierInfo(customer.current_tier);
  const TierIcon = tierInfo.icon;

  const handleConfirmRedemption = async () => {
    try {
      setLoading(true);
      setStep('processing');
      
      await onConfirm();
      
      // Generate redemption code
      const code = `${restaurant.name.substring(0, 3).toUpperCase()}-${Date.now().toString().slice(-6)}`;
      setRedemptionCode(code);
      
      setStep('qr');
    } catch (error) {
      console.error('Redemption failed:', error);
      setStep('confirm');
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleStaffConfirmation = () => {
    setStep('complete');
    setTimeout(() => {
      onClose();
      // Reset state for next use
      setStep('confirm');
      setRedemptionCode('');
      setCopied(false);
    }, 3000);
  };

  return (
    <motion.div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <motion.div 
        className="bg-white/95 backdrop-blur-xl rounded-3xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/20"
        initial={{ scale: 0.9, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.9, opacity: 0, y: 20 }}
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 bg-gradient-to-r from-blue-50 to-indigo-50">
          <h3 className="text-xl font-bold text-gray-900">
            {step === 'confirm' ? 'Confirm Redemption' :
             step === 'processing' ? 'Processing...' :
             step === 'qr' ? 'Redemption QR Code' :
             'Redemption Complete!'}
          </h3>
          <motion.button
            onClick={onClose}
            className="p-3 text-gray-400 hover:text-gray-600 rounded-2xl hover:bg-white/50 transition-all duration-300"
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            <X className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Confirmation Step */}
        {step === 'confirm' && (
          <motion.div 
            className="p-6 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {/* Reward Details */}
            <motion.div 
              className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-2xl p-6 border border-blue-200"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.1 }}
            >
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-2xl flex items-center justify-center shadow-lg">
                  <Gift className="h-8 w-8 text-white" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-gray-900 mb-2 text-lg">{reward.name}</h4>
                  {reward.description && (
                    <p className="text-gray-600 mb-3">{reward.description}</p>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-bold text-[#1E2A78]">
                      {reward.points_required} points
                    </span>
                    <span className="text-xs px-3 py-1 rounded-full bg-blue-100 text-blue-800 font-medium">
                      {reward.category}
                    </span>
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Customer Info */}
            <motion.div 
              className="bg-gray-50 rounded-2xl p-6"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-14 h-14 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-2xl flex items-center justify-center text-white font-bold text-lg shadow-lg">
                  {customer.first_name[0]}{customer.last_name[0]}
                </div>
                <div>
                  <p className="font-bold text-gray-900 text-lg">
                    {customer.first_name} {customer.last_name}
                  </p>
                  <div className="flex items-center gap-2">
                    <TierIcon className={`h-4 w-4 ${tierInfo.color}`} />
                    <span className="text-sm font-medium text-gray-600">{tierInfo.name} Member</span>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-500 text-sm font-medium">Current Points</p>
                  <p className="font-bold text-gray-900 text-lg">{customer.total_points.toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm font-medium">After Redemption</p>
                  <p className="font-bold text-gray-900 text-lg">
                    {(customer.total_points - reward.points_required).toLocaleString()}
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Warning */}
            <motion.div 
              className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-yellow-900 mb-1">Important</p>
                  <p className="text-yellow-800 text-sm">
                    Once confirmed, {reward.points_required} points will be deducted from your account. 
                    Show the QR code to staff to complete your redemption.
                  </p>
                </div>
              </div>
            </motion.div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <motion.button
                onClick={onClose}
                className="flex-1 py-4 px-4 border border-gray-200 text-gray-700 rounded-2xl hover:bg-gray-50 transition-colors font-semibold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Cancel
              </motion.button>
              <motion.button
                onClick={handleConfirmRedemption}
                disabled={loading}
                className="flex-1 py-4 px-4 bg-gradient-to-r from-[#1E2A78] to-[#3B4B9A] text-white rounded-2xl hover:shadow-xl transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                {loading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    Confirm Redemption
                  </>
                )}
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Processing Step */}
        {step === 'processing' && (
          <motion.div 
            className="p-6 text-center py-12"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div 
              className="w-20 h-20 bg-gradient-to-br from-[#1E2A78] to-[#3B4B9A] rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl"
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            >
              <Loader2 className="h-8 w-8 text-white animate-spin" />
            </motion.div>
            <h4 className="text-xl font-bold text-gray-900 mb-3">Processing Redemption</h4>
            <p className="text-gray-600 text-lg">Please wait while we process your reward redemption...</p>
          </motion.div>
        )}

        {/* QR Code Step */}
        {step === 'qr' && (
          <motion.div 
            className="p-6 space-y-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            <div className="text-center">
              <motion.div 
                className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: "spring", stiffness: 200 }}
              >
                <CheckCircle className="h-8 w-8 text-green-600" />
              </motion.div>
              <h4 className="text-xl font-bold text-gray-900 mb-3">Redemption Confirmed!</h4>
              <p className="text-gray-600 text-lg">Show this QR code to staff to claim your reward</p>
            </div>

            {/* QR Code Display */}
            <motion.div 
              className="bg-gray-50 rounded-2xl p-6 text-center"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
            >
              <div className="w-48 h-48 bg-white rounded-2xl mx-auto mb-6 flex items-center justify-center border-2 border-gray-200 shadow-lg">
                <QrCode className="h-24 w-24 text-gray-400" />
              </div>
              
              <div className="space-y-2">
                <p className="font-bold text-gray-900 text-lg">Redemption Code</p>
                <div className="flex items-center justify-center gap-2">
                  <code className="bg-white px-4 py-3 rounded-2xl border text-xl font-mono font-bold shadow-sm">
                    {redemptionCode}
                  </code>
                  <motion.button
                    onClick={() => copyToClipboard(redemptionCode)}
                    className="p-3 text-gray-600 hover:text-gray-800 rounded-2xl hover:bg-gray-200 transition-colors"
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                  >
                    {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  </motion.button>
                </div>
              </div>
            </motion.div>

            {/* Reward Details */}
            <motion.div 
              className="bg-blue-50 rounded-2xl p-4 border border-blue-200"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <h5 className="font-bold text-blue-900 mb-2">Your Reward</h5>
              <p className="text-blue-800 font-bold text-lg">{reward.name}</p>
              {reward.description && (
                <p className="text-blue-700 text-sm mt-1">{reward.description}</p>
              )}
            </motion.div>

            {/* Instructions */}
            <motion.div 
              className="bg-yellow-50 border border-yellow-200 rounded-2xl p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-yellow-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-yellow-900 mb-2">Next Steps</p>
                  <ol className="text-yellow-800 text-sm space-y-1 list-decimal list-inside">
                    <li>Show this QR code to restaurant staff</li>
                    <li>Staff will scan or enter the redemption code</li>
                    <li>Enjoy your reward!</li>
                  </ol>
                </div>
              </div>
            </motion.div>

            {/* Demo Staff Confirmation Button */}
            <div className="border-t border-gray-200 pt-4">
              <p className="text-xs text-gray-500 text-center mb-3">
                Demo: Staff would scan this QR code
              </p>
              <motion.button
                onClick={handleStaffConfirmation}
                className="w-full py-4 px-4 bg-green-600 text-white rounded-2xl hover:bg-green-700 transition-colors flex items-center justify-center gap-2 font-bold"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <CheckCircle className="h-4 w-4" />
                Staff: Confirm Redemption
              </motion.button>
            </div>
          </motion.div>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <motion.div 
            className="p-6 text-center py-12"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <motion.div 
              className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
            >
              <CheckCircle className="h-8 w-8 text-green-600" />
            </motion.div>
            <h4 className="text-2xl font-bold text-gray-900 mb-3">Reward Claimed!</h4>
            <p className="text-gray-600 mb-6 text-lg">
              Your {reward.name} has been successfully redeemed. Enjoy!
            </p>
            <motion.div 
              className="bg-green-50 border border-green-200 rounded-2xl p-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <div className="flex items-center gap-2 justify-center">
                <Star className="h-4 w-4 text-green-600" />
                <p className="text-green-800 text-sm font-bold">
                  Thank you for being a loyal customer at {restaurant.name}!
                </p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </motion.div>
    </motion.div>
  );
};

export default CustomerRedemptionModal;