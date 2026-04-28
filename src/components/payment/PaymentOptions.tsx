'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';

type PaymentType = 'BUDGET' | 'ONE_PAYMENT' | 'TIERED';
type Currency = 'ZAR' | 'USD' | 'EUR' | 'GBP';

const EXCHANGE_RATES: Record<Currency, number> = {
  ZAR: 1,
  USD: 0.053,
  EUR: 0.049,
  GBP: 0.042,
};

const CURRENCY_SYMBOLS: Record<Currency, string> = {
  ZAR: 'R',
  USD: '$',
  EUR: '€',
  GBP: '£',
};

interface PaymentOptionsProps {
  budgetPrice?: number;
  onePaymentPrice?: number;
  tieredBasePrice?: number;
  tieredMaxPrice?: number;
  defaultCurrency?: Currency;
  onSelect: (option: PaymentType, amount: number, currency: Currency) => void;
}

export default function PaymentOptions({
  budgetPrice,
  onePaymentPrice,
  tieredBasePrice,
  tieredMaxPrice,
  defaultCurrency = 'ZAR',
  onSelect,
}: PaymentOptionsProps) {
  const [selectedOption, setSelectedOption] = useState<PaymentType>('ONE_PAYMENT');
  const [currency, setCurrency] = useState<Currency>(defaultCurrency);
  const [tieredAmount, setTieredAmount] = useState(tieredBasePrice || 0);

  const convertAmount = (amount: number): number => {
    return Math.round(amount * EXCHANGE_RATES[currency]);
  };

  const formatAmount = (amount: number): string => {
    return `${CURRENCY_SYMBOLS[currency]}${convertAmount(amount).toLocaleString()}`;
  };

  const handleSelect = (option: PaymentType) => {
    setSelectedOption(option);
    
    let amount = 0;
    switch (option) {
      case 'BUDGET':
        amount = budgetPrice || 0;
        break;
      case 'ONE_PAYMENT':
        amount = onePaymentPrice || 0;
        break;
      case 'TIERED':
        amount = tieredAmount;
        break;
    }
    
    onSelect(option, amount, currency);
  };

  const handleCurrencyChange = (newCurrency: Currency) => {
    setCurrency(newCurrency);
    // Re-trigger selection with new currency
    let amount = 0;
    switch (selectedOption) {
      case 'BUDGET':
        amount = budgetPrice || 0;
        break;
      case 'ONE_PAYMENT':
        amount = onePaymentPrice || 0;
        break;
      case 'TIERED':
        amount = tieredAmount;
        break;
    }
    onSelect(selectedOption, amount, newCurrency);
  };

  return (
    <div className="space-y-6">
      {/* Currency Selector */}
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-slate-300">Select Currency</label>
        <div className="flex gap-2">
          {(Object.keys(CURRENCY_SYMBOLS) as Currency[]).map((curr) => (
            <button
              key={curr}
              onClick={() => handleCurrencyChange(curr)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                currency === curr
                  ? 'bg-amber-500 text-slate-900'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {curr}
            </button>
          ))}
        </div>
      </div>

      {/* Payment Options */}
      <div className="grid gap-4">
        {/* Budget Option */}
        {budgetPrice !== undefined && budgetPrice > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect('BUDGET')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              selectedOption === 'BUDGET'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedOption === 'BUDGET' ? 'border-amber-500' : 'border-slate-600'
                  }`}>
                    {selectedOption === 'BUDGET' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <span className="font-semibold text-slate-200">Budget Option</span>
                </div>
                <p className="text-sm text-slate-400 mt-1 ml-7">
                  Best for cost-conscious buyers
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-amber-400">
                  {formatAmount(budgetPrice)}
                </span>
                <p className="text-xs text-slate-500">one-time</p>
              </div>
            </div>
          </motion.button>
        )}

        {/* One Payment Option */}
        {onePaymentPrice !== undefined && onePaymentPrice > 0 && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect('ONE_PAYMENT')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              selectedOption === 'ONE_PAYMENT'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedOption === 'ONE_PAYMENT' ? 'border-amber-500' : 'border-slate-600'
                  }`}>
                    {selectedOption === 'ONE_PAYMENT' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <span className="font-semibold text-slate-200">Single Payment</span>
                </div>
                <p className="text-sm text-slate-400 mt-1 ml-7">
                  Full access, pay once
                </p>
              </div>
              <div className="text-right">
                <span className="text-2xl font-bold text-amber-400">
                  {formatAmount(onePaymentPrice)}
                </span>
                <p className="text-xs text-slate-500">one-time</p>
              </div>
            </div>
          </motion.button>
        )}

        {/* Tiered Option */}
        {tieredBasePrice !== undefined && tieredMaxPrice !== undefined && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => handleSelect('TIERED')}
            className={`p-4 rounded-xl border-2 text-left transition-all ${
              selectedOption === 'TIERED'
                ? 'border-amber-500 bg-amber-500/10'
                : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            }`}
          >
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                    selectedOption === 'TIERED' ? 'border-amber-500' : 'border-slate-600'
                  }`}>
                    {selectedOption === 'TIERED' && (
                      <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    )}
                  </div>
                  <span className="font-semibold text-slate-200">Tiered Pricing</span>
                </div>
                <div className="text-right">
                  <span className="text-2xl font-bold text-amber-400">
                    {formatAmount(tieredAmount)}
                  </span>
                  <p className="text-xs text-slate-500">custom amount</p>
                </div>
              </div>

              {/* Tiered Slider */}
              {selectedOption === 'TIERED' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="ml-7"
                >
                  <input
                    type="range"
                    min={tieredBasePrice}
                    max={tieredMaxPrice}
                    step={10}
                    value={tieredAmount}
                    onChange={(e) => {
                      const newAmount = Number(e.target.value);
                      setTieredAmount(newAmount);
                      onSelect('TIERED', newAmount, currency);
                    }}
                    className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-amber-500"
                  />
                  <div className="flex justify-between text-xs text-slate-500 mt-2">
                    <span>{formatAmount(tieredBasePrice)}</span>
                    <span>{formatAmount(tieredMaxPrice)}</span>
                  </div>
                  <p className="text-sm text-slate-400 mt-2">
                    Adjust your investment level to unlock features
                  </p>
                </motion.div>
              )}
            </div>
          </motion.button>
        )}
      </div>

      {/* Summary */}
      <div className="p-4 rounded-xl bg-slate-800/50 border border-slate-700">
        <div className="flex items-center justify-between">
          <span className="text-slate-400">Selected Option</span>
          <span className="font-semibold text-slate-200">
            {selectedOption === 'BUDGET' && 'Budget Option'}
            {selectedOption === 'ONE_PAYMENT' && 'Single Payment'}
            {selectedOption === 'TIERED' && 'Tiered Pricing'}
          </span>
        </div>
        <div className="flex items-center justify-between mt-2">
          <span className="text-slate-400">Currency</span>
          <span className="font-semibold text-slate-200">{currency}</span>
        </div>
      </div>
    </div>
  );
}
