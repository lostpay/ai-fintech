import React from 'react';
import { BudgetScreen } from '../../src/screens/BudgetScreen';

export default function BudgetRoute() {
  // Expo Router doesn't provide navigation prop directly, but BudgetScreen doesn't actually use it
  // for navigation since it uses Modal for the form
  return <BudgetScreen navigation={{} as any} route={{} as any} />;
}