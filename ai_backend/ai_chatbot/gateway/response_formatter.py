"""
Response Formatter for AI Chatbot.
Transforms raw ML/SQL outputs into natural, conversational responses.
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import json

class ResponseFormatter:
    """Formats technical responses from backend services into natural language"""

    def __init__(self):
        self.currency_symbol = "$"

    def format_ml_response(self, ml_data: Dict, analysis_type: str, lang: str = "en") -> str:
        """
        Route ML responses to appropriate formatter based on analysis type.

        Args:
            ml_data: Raw data from ML service
            analysis_type: Type of analysis (predict, budget, patterns, etc.)
            lang: Language code for response formatting

        Returns:
            Formatted natural language response
        """
        if analysis_type == "predict":
            return self._format_predictions(ml_data, lang)
        elif analysis_type == "budget":
            return self._format_budget(ml_data, lang)
        elif analysis_type == "patterns":
            return self._format_patterns(ml_data, lang)
        else:
            return self._format_generic(ml_data, lang)

    def _format_predictions(self, data: Dict, lang: str) -> str:
        """Convert spending prediction data into readable text"""
        predictions = data.get('predictions', [])
        confidence = data.get('confidence', 0)
        timeframe = data.get('timeframe', 'weekly')

        if not predictions:
            if lang == "zh":
                return "抱歉，我暂时无法生成预测。请确保您有足够的历史数据。"
            return "I couldn't generate predictions at this time. Please ensure you have sufficient transaction history."

        if lang == "zh":
            response = f"根据您的消费模式分析（置信度 {confidence:.0%}）：\n\n"

            # Show top 2 predictions with natural language insights
            for i, pred in enumerate(predictions[:2], 1):
                amount = pred.get('predicted_amount', 0)
                lower = pred.get('lower_bound', 0)
                upper = pred.get('upper_bound', 0)

                # Determine period description based on timeframe
                if timeframe == 'weekly':
                    period_desc = f"第{i}周"
                elif timeframe == 'monthly':
                    period_desc = f"第{i}个月"
                else:
                    period_desc = f"第{i}天"

                response += f"{period_desc}预测支出: {self.currency_symbol}{amount:.0f}\n"

                # Add contextual insight based on prediction variance
                if amount > 0:
                    variance_ratio = (upper - lower) / amount if amount > 0 else 0
                    if variance_ratio > 0.5:
                        response += "   （支出可能有较大波动）\n"
                    else:
                        response += "   （预计相对稳定）\n"
                else:
                    response += "   （预计支出很少或没有）\n"

            # Add actionable recommendation
            if predictions[0].get('predicted_amount', 0) > 500:
                response += "\n建议：预计支出较高，记得预留足够预算。"
            else:
                response += "\n建议：支出预测较低，保持良好的节省习惯！"

        else:
            response = f"Based on your spending patterns (confidence: {confidence:.0%}):\n\n"

            for i, pred in enumerate(predictions[:2], 1):
                amount = pred.get('predicted_amount', 0)
                lower = pred.get('lower_bound', 0)
                upper = pred.get('upper_bound', 0)

                if timeframe == 'weekly':
                    period_desc = f"Week {i}"
                elif timeframe == 'monthly':
                    period_desc = f"Month {i}"
                else:
                    period_desc = f"Day {i}"

                response += f"{period_desc}: {self.currency_symbol}{amount:.0f} expected\n"

                # Provide variance insight
                if amount > 0:
                    variance_ratio = (upper - lower) / amount if amount > 0 else 0
                    if variance_ratio > 0.5:
                        response += "   (May vary significantly)\n"
                    else:
                        response += "   (Likely to be stable)\n"
                else:
                    response += "   (Minimal or no spending expected)\n"

            if predictions[0].get('predicted_amount', 0) > 500:
                response += "\nTip: Higher spending expected - ensure adequate funds."
            else:
                response += "\nTip: Low spending predicted - great job saving!"

        return response

    def _format_budget(self, data: Dict, lang: str) -> str:
        """Transform budget recommendations into user-friendly format"""
        categories = data.get('categories', [])
        total = data.get('total_budget', 0)

        if not categories:
            if lang == "zh":
                return "暂时无法生成预算建议。请添加更多交易记录。"
            return "Unable to generate budget recommendations. Please add more transactions."

        # Sort and select top spending categories
        sorted_cats = sorted(categories, key=lambda x: x['amount'], reverse=True)
        top_cats = sorted_cats[:5]

        if lang == "zh":
            response = f"您的个性化预算建议（每月）：\n\n"
            response += f"总预算: {self.currency_symbol}{total:.0f}\n\n"
            response += "主要类别：\n"

            for cat in top_cats:
                name = self._translate_category(cat['category'], 'zh')
                amount = cat['amount']
                response += f"{name}: {self.currency_symbol}{amount:.0f}\n"

                # Add context-specific advice
                activity = cat.get('activity_level', '')
                if activity == 'inactive':
                    response += "   很少使用 - 可以考虑减少\n"
                elif amount > total * 0.3:
                    response += "   占比较大 - 注意控制\n"

            response += "\n建议：重点关注占比最大的类别，适当调整可以更好地控制支出。"

        else:
            response = f"Your Personalized Monthly Budget:\n\n"
            response += f"Total: {self.currency_symbol}{total:.0f}\n\n"
            response += "Key Categories:\n"

            for cat in top_cats:
                name = cat['category']
                amount = cat['amount']
                response += f"{name}: {self.currency_symbol}{amount:.0f}\n"

                activity = cat.get('activity_level', '')
                if activity == 'inactive':
                    response += "   Rarely used - consider reducing\n"
                elif amount > total * 0.3:
                    response += "   Large portion - monitor closely\n"

            response += "\nTip: Focus on your largest spending categories for the most impact on your budget."

        return response

    def _format_patterns(self, data: Dict, lang: str) -> str:
        """Present spending pattern analysis in readable format"""
        recurrences = data.get('recurrences', [])
        spikes = data.get('spikes', [])
        insights = data.get('insights', [])
        volatility = data.get('volatility', {})

        if lang == "zh":
            response = "您的消费模式分析：\n\n"

            # Show recurring expenses
            if recurrences:
                response += "定期支出：\n"
                for rec in recurrences[:3]:
                    cat = self._translate_category(rec['category'], 'zh')
                    pattern = self._translate_pattern(rec['pattern'], 'zh')
                    response += f"- {cat} {pattern}出现\n"
            else:
                response += "没有检测到明显的定期支出模式\n"

            # Highlight spending spikes
            if spikes:
                recent_spikes = [s for s in spikes if s.get('recent', False)]
                if recent_spikes:
                    response += f"\n最近有较大支出（比平均高出很多）\n"
                else:
                    response += f"\n历史上有{len(spikes)}次支出高峰\n"

            # Report high volatility categories
            high_vol = [k for k, v in volatility.items() if v > 0.5]
            if high_vol:
                response += f"\n这些类别支出波动较大：{', '.join(high_vol)}\n"

            # Share key insights
            if insights:
                response += "\n关键发现：\n"
                for insight in insights[:2]:
                    response += f"- {self._translate_insight(insight, 'zh')}\n"

        else:
            response = "Your Spending Pattern Analysis:\n\n"

            if recurrences:
                response += "Recurring Expenses:\n"
                for rec in recurrences[:3]:
                    cat = rec['category']
                    pattern = rec['pattern']
                    response += f"- {cat} occurs {pattern}\n"
            else:
                response += "No clear recurring patterns detected\n"

            if spikes:
                recent_spikes = [s for s in spikes if s.get('recent', False)]
                if recent_spikes:
                    response += f"\nRecent spending spike detected\n"
                else:
                    response += f"\n{len(spikes)} historical spending spikes found\n"

            high_vol = [k for k, v in volatility.items() if v > 0.5]
            if high_vol:
                response += f"\nHigh variability in: {', '.join(high_vol)}\n"

            if insights:
                response += "\nKey Insights:\n"
                for insight in insights[:2]:
                    response += f"- {insight}\n"

        return response

    def _format_generic(self, data: Dict, lang: str) -> str:
        """Handle generic or error responses"""
        if isinstance(data, dict):
            if 'error' in data:
                if lang == "zh":
                    return "抱歉，处理您的请求时遇到了问题。请稍后重试。"
                return "Sorry, I encountered an issue processing your request. Please try again."

            # Format as key-value pairs for readability
            response = ""
            for key, value in data.items():
                if not key.startswith('_'):
                    response += f"{key}: {value}\n"
            return response or str(data)

        return str(data)

    def _translate_category(self, category: str, lang: str) -> str:
        """Translate category names to specified language"""
        if lang != 'zh':
            return category

        translations = {
            'Food': '餐饮',
            'Transport': '交通',
            'Shopping': '购物',
            'Entertainment': '娱乐',
            'Home': '居家',
            'Bills': '账单',
            'Beverage': '饮料',
            'Beauty': '美容',
            'Sports': '运动',
            'Personal': '个人',
            'Work': '工作',
            'Travel': '旅游',
            'Other': '其他'
        }
        return translations.get(category, category)

    def _translate_pattern(self, pattern: str, lang: str) -> str:
        """Translate pattern frequency terms"""
        if lang != 'zh':
            return pattern

        translations = {
            'weekly': '每周',
            'bi-weekly': '每两周',
            'monthly': '每月',
            'daily': '每天'
        }
        return translations.get(pattern, pattern)

    def _translate_insight(self, insight: str, lang: str) -> str:
        """Translate or simplify insight messages"""
        if lang != 'zh':
            return insight

        # Keyword-based translation for common insights
        if 'volatility' in insight.lower():
            return '支出波动较大'
        elif 'peak' in insight.lower() or 'spike' in insight.lower():
            return '存在支出高峰'
        elif 'stable' in insight.lower():
            return '支出相对稳定'
        else:
            return insight

    def format_sql_response(self, sql_data: Dict, lang: str = "en") -> str:
        """
        Format SQL query results for user display.
        Handles both single-row aggregations and multi-row result sets.
        """
        if not sql_data or sql_data.get('error'):
            if lang == "zh":
                return "无法获取数据。请检查您的查询。"
            return "Unable to retrieve data. Please check your query."

        data = sql_data.get('data', [])
        row_count = sql_data.get('row_count', 0)

        if row_count == 0:
            if lang == "zh":
                return "没有找到符合条件的记录。"
            return "No records found matching your criteria."

        # Route to appropriate formatter based on result structure
        if isinstance(data, list) and data:
            if row_count == 1 and isinstance(data[0], dict):
                return self._format_single_row(data[0], lang)
            else:
                return self._format_multiple_rows(data, lang)

        return str(data)

    def _format_single_row(self, row: Dict, lang: str) -> str:
        """Format single-row results, typically aggregations like totals or averages"""
        response = ""

        for key, value in row.items():
            readable_key = key.replace('_', ' ').title()

            # Format numeric values appropriately
            if isinstance(value, (int, float)):
                if any(term in key.lower() for term in ['amount', 'total', 'sum']):
                    formatted_value = f"{self.currency_symbol}{value:.2f}"
                else:
                    formatted_value = f"{value:,.0f}" if value > 100 else str(value)
            else:
                formatted_value = str(value)

            if lang == "zh":
                response += f"{self._translate_field(readable_key, 'zh')}: {formatted_value}\n"
            else:
                response += f"{readable_key}: {formatted_value}\n"

        return response

    def _format_multiple_rows(self, rows: List[Dict], lang: str, max_rows: int = 5) -> str:
        """Format multiple row results with truncation for readability"""
        if lang == "zh":
            response = f"找到 {len(rows)} 条记录：\n\n"
        else:
            response = f"Found {len(rows)} records:\n\n"

        # Display first few rows with key information
        for i, row in enumerate(rows[:max_rows], 1):
            response += f"{i}. "

            if 'description' in row:
                response += f"{row['description']} - "
            if 'amount' in row:
                response += f"{self.currency_symbol}{row['amount']}"
            if 'date' in row:
                response += f" ({row['date']})"

            response += "\n"

        # Indicate if results were truncated
        if len(rows) > max_rows:
            if lang == "zh":
                response += f"\n...还有 {len(rows) - max_rows} 条记录"
            else:
                response += f"\n...and {len(rows) - max_rows} more"

        return response

    def _translate_field(self, field: str, lang: str) -> str:
        """Translate common field names for SQL results"""
        if lang != 'zh':
            return field

        translations = {
            'Total': '总计',
            'Amount': '金额',
            'Count': '数量',
            'Average': '平均',
            'Category': '类别',
            'Date': '日期',
            'Description': '描述'
        }
        return translations.get(field, field)
