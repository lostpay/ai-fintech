import { BudgetAlert } from '../types/BudgetAlert';
import { formatCurrency } from './currency';

export type SupportedLanguage = 'en' | 'es' | 'fr' | 'de' | 'ja' | 'zh' | 'pt' | 'it' | 'ru' | 'ko';

interface AlertMessages {
  approaching: string;
  atLimit: string;
  overBudget: string;
  default: string;
}

interface SuggestedActionsMessages {
  approaching: string[];
  atLimit: string[];
  overBudget: string[];
  common: string[];
}

const ALERT_MESSAGES: Record<SupportedLanguage, AlertMessages> = {
  en: {
    approaching: "You've spent {spent} of your {budget} {category} budget. {remaining} remaining.",
    atLimit: "You've reached your {budget} {category} budget limit. Consider reviewing your spending.",
    overBudget: "You're {remaining} over your {budget} {category} budget. Time to adjust your spending!",
    default: "Budget update for {category}: {spent} spent of {budget}.",
  },
  es: {
    approaching: "Has gastado {spent} de tu presupuesto de {budget} en {category}. Quedan {remaining}.",
    atLimit: "Has alcanzado el límite de tu presupuesto de {budget} en {category}. Considera revisar tus gastos.",
    overBudget: "Te has excedido por {remaining} en tu presupuesto de {budget} en {category}. ¡Es hora de ajustar tus gastos!",
    default: "Actualización de presupuesto para {category}: {spent} gastado de {budget}.",
  },
  fr: {
    approaching: "Vous avez dépensé {spent} de votre budget {category} de {budget}. Il reste {remaining}.",
    atLimit: "Vous avez atteint la limite de votre budget {category} de {budget}. Considérez revoir vos dépenses.",
    overBudget: "Vous avez dépassé de {remaining} votre budget {category} de {budget}. Il est temps d'ajuster vos dépenses!",
    default: "Mise à jour du budget pour {category}: {spent} dépensé sur {budget}.",
  },
  de: {
    approaching: "Sie haben {spent} von Ihrem {category}-Budget von {budget} ausgegeben. {remaining} verbleiben.",
    atLimit: "Sie haben Ihr {category}-Budget-Limit von {budget} erreicht. Überprüfen Sie Ihre Ausgaben.",
    overBudget: "Sie haben Ihr {category}-Budget von {budget} um {remaining} überschritten. Zeit, Ihre Ausgaben anzupassen!",
    default: "Budget-Update für {category}: {spent} von {budget} ausgegeben.",
  },
  ja: {
    approaching: "{category}の予算{budget}のうち{spent}を使いました。残り{remaining}です。",
    atLimit: "{category}の予算制限{budget}に達しました。支出を見直すことを検討してください。",
    overBudget: "{category}の予算{budget}を{remaining}超過しています。支出を調整する時間です！",
    default: "{category}の予算更新：{budget}のうち{spent}を支出。",
  },
  zh: {
    approaching: "您已花费了{category}预算{budget}中的{spent}。剩余{remaining}。",
    atLimit: "您已达到{category}预算限额{budget}。请考虑检查您的支出。",
    overBudget: "您的{category}预算{budget}已超支{remaining}。是时候调整您的支出了！",
    default: "{category}预算更新：已花费{spent}，预算{budget}。",
  },
  pt: {
    approaching: "Você gastou {spent} do seu orçamento de {category} de {budget}. Restam {remaining}.",
    atLimit: "Você atingiu o limite do seu orçamento de {category} de {budget}. Considere revisar seus gastos.",
    overBudget: "Você excedeu em {remaining} seu orçamento de {category} de {budget}. Hora de ajustar seus gastos!",
    default: "Atualização do orçamento para {category}: {spent} gasto de {budget}.",
  },
  it: {
    approaching: "Hai speso {spent} del tuo budget {category} di {budget}. Rimangono {remaining}.",
    atLimit: "Hai raggiunto il limite del tuo budget {category} di {budget}. Considera di rivedere le tue spese.",
    overBudget: "Hai superato di {remaining} il tuo budget {category} di {budget}. È ora di aggiustare le tue spese!",
    default: "Aggiornamento budget per {category}: {spent} speso di {budget}.",
  },
  ru: {
    approaching: "Вы потратили {spent} из вашего бюджета {category} в {budget}. Осталось {remaining}.",
    atLimit: "Вы достигли лимита вашего бюджета {category} в {budget}. Рассмотрите пересмотр ваших расходов.",
    overBudget: "Вы превысили ваш бюджет {category} в {budget} на {remaining}. Время скорректировать ваши расходы!",
    default: "Обновление бюджета для {category}: потрачено {spent} из {budget}.",
  },
  ko: {
    approaching: "{category} 예산 {budget} 중 {spent}을(를) 사용했습니다. {remaining} 남았습니다.",
    atLimit: "{category} 예산 한도 {budget}에 도달했습니다. 지출을 검토해보세요.",
    overBudget: "{category} 예산 {budget}을(를) {remaining} 초과했습니다. 지출을 조정할 시간입니다!",
    default: "{category}에 대한 예산 업데이트: {budget} 중 {spent} 지출.",
  },
};

const SUGGESTED_ACTIONS: Record<SupportedLanguage, SuggestedActionsMessages> = {
  en: {
    approaching: ['Review remaining budget', 'Consider reducing spending', 'View recent transactions'],
    atLimit: ['Review budget details', 'Adjust spending plan', 'Increase budget if needed'],
    overBudget: ['Review overspending', 'Adjust budget amount', 'Plan spending reduction', 'Move to different category'],
    common: ['View budget analytics'],
  },
  es: {
    approaching: ['Revisar presupuesto restante', 'Considerar reducir gastos', 'Ver transacciones recientes'],
    atLimit: ['Revisar detalles del presupuesto', 'Ajustar plan de gastos', 'Aumentar presupuesto si es necesario'],
    overBudget: ['Revisar gastos excesivos', 'Ajustar cantidad del presupuesto', 'Planificar reducción de gastos', 'Mover a otra categoría'],
    common: ['Ver análisis del presupuesto'],
  },
  fr: {
    approaching: ['Examiner le budget restant', 'Envisager de réduire les dépenses', 'Voir les transactions récentes'],
    atLimit: ['Examiner les détails du budget', 'Ajuster le plan de dépenses', 'Augmenter le budget si nécessaire'],
    overBudget: ['Examiner les dépenses excessives', 'Ajuster le montant du budget', 'Planifier la réduction des dépenses', 'Déplacer vers une autre catégorie'],
    common: ['Voir les analyses du budget'],
  },
  de: {
    approaching: ['Verbleibendes Budget überprüfen', 'Ausgaben reduzieren erwägen', 'Aktuelle Transaktionen anzeigen'],
    atLimit: ['Budget-Details überprüfen', 'Ausgabenplan anpassen', 'Budget bei Bedarf erhöhen'],
    overBudget: ['Überschreitung überprüfen', 'Budget-Betrag anpassen', 'Ausgabenreduzierung planen', 'In andere Kategorie verschieben'],
    common: ['Budget-Analysen anzeigen'],
  },
  ja: {
    approaching: ['残り予算を確認', '支出削減を検討', '最近の取引を確認'],
    atLimit: ['予算詳細を確認', '支出計画を調整', '必要に応じて予算を増やす'],
    overBudget: ['超過支出を確認', '予算額を調整', '支出削減を計画', '他のカテゴリに移動'],
    common: ['予算分析を確認'],
  },
  zh: {
    approaching: ['查看剩余预算', '考虑减少支出', '查看最近交易'],
    atLimit: ['查看预算详情', '调整支出计划', '如需要增加预算'],
    overBudget: ['查看超支情况', '调整预算金额', '计划减少支出', '移至其他类别'],
    common: ['查看预算分析'],
  },
  pt: {
    approaching: ['Revisar orçamento restante', 'Considerar reduzir gastos', 'Ver transações recentes'],
    atLimit: ['Revisar detalhes do orçamento', 'Ajustar plano de gastos', 'Aumentar orçamento se necessário'],
    overBudget: ['Revisar gastos excessivos', 'Ajustar valor do orçamento', 'Planejar redução de gastos', 'Mover para categoria diferente'],
    common: ['Ver análises do orçamento'],
  },
  it: {
    approaching: ['Rivedere budget rimanente', 'Considerare riduzione spese', 'Vedere transazioni recenti'],
    atLimit: ['Rivedere dettagli budget', 'Aggiustare piano spese', 'Aumentare budget se necessario'],
    overBudget: ['Rivedere spese eccessive', 'Aggiustare importo budget', 'Pianificare riduzione spese', 'Spostare in categoria diversa'],
    common: ['Vedere analisi budget'],
  },
  ru: {
    approaching: ['Проверить оставшийся бюджет', 'Рассмотреть сокращение расходов', 'Просмотреть последние транзакции'],
    atLimit: ['Проверить детали бюджета', 'Скорректировать план расходов', 'Увеличить бюджет при необходимости'],
    overBudget: ['Проверить превышение', 'Скорректировать сумму бюджета', 'Спланировать сокращение расходов', 'Переместить в другую категорию'],
    common: ['Просмотреть анализ бюджета'],
  },
  ko: {
    approaching: ['남은 예산 검토', '지출 감소 고려', '최근 거래 보기'],
    atLimit: ['예산 세부사항 검토', '지출 계획 조정', '필요시 예산 증가'],
    overBudget: ['초과 지출 검토', '예산 금액 조정', '지출 감소 계획', '다른 카테고리로 이동'],
    common: ['예산 분석 보기'],
  },
};

/**
 * Generate localized alert message
 */
export const generateLocalizedAlertMessage = (
  alert: BudgetAlert, 
  language: SupportedLanguage = 'en'
): string => {
  const messages = ALERT_MESSAGES[language] || ALERT_MESSAGES.en;
  const remaining = Math.abs(alert.remaining_amount);
  
  const replacements = {
    spent: formatCurrency(alert.spent_amount),
    budget: formatCurrency(alert.budget_amount),
    remaining: formatCurrency(remaining),
    category: alert.category_name,
  };

  let template: string;
  switch (alert.alert_type) {
    case 'approaching':
      template = messages.approaching;
      break;
    case 'at_limit':
      template = messages.atLimit;
      break;
    case 'over_budget':
      template = messages.overBudget;
      break;
    default:
      template = messages.default;
      break;
  }

  // Replace placeholders
  return Object.entries(replacements).reduce(
    (text, [key, value]) => text.replace(new RegExp(`{${key}}`, 'g'), value),
    template
  );
};

/**
 * Get localized suggested actions
 */
export const getLocalizedSuggestedActions = (
  alert: BudgetAlert, 
  language: SupportedLanguage = 'en'
): string[] => {
  const actions = SUGGESTED_ACTIONS[language] || SUGGESTED_ACTIONS.en;
  
  let suggestions: string[] = [];
  switch (alert.alert_type) {
    case 'approaching':
      suggestions = [...actions.approaching];
      break;
    case 'at_limit':
      suggestions = [...actions.atLimit];
      break;
    case 'over_budget':
      suggestions = [...actions.overBudget];
      break;
  }
  
  suggestions.push(...actions.common);
  return suggestions;
};

/**
 * Get current app language (placeholder - would integrate with i18n system)
 */
export const getCurrentLanguage = (): SupportedLanguage => {
  // In a real app, this would integrate with the i18n system
  // For now, return 'en' as default
  return 'en';
};

/**
 * Get available languages for selection
 */
export const getAvailableLanguages = (): Array<{ code: SupportedLanguage; name: string; nativeName: string }> => {
  return [
    { code: 'en', name: 'English', nativeName: 'English' },
    { code: 'es', name: 'Spanish', nativeName: 'Español' },
    { code: 'fr', name: 'French', nativeName: 'Français' },
    { code: 'de', name: 'German', nativeName: 'Deutsch' },
    { code: 'ja', name: 'Japanese', nativeName: '日本語' },
    { code: 'zh', name: 'Chinese', nativeName: '中文' },
    { code: 'pt', name: 'Portuguese', nativeName: 'Português' },
    { code: 'it', name: 'Italian', nativeName: 'Italiano' },
    { code: 'ru', name: 'Russian', nativeName: 'Русский' },
    { code: 'ko', name: 'Korean', nativeName: '한국어' },
  ];
};