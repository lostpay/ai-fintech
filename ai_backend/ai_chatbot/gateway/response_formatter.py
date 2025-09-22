"""
Response Formatter for AI Chatbot
Transforms raw ML/SQL outputs into natural, conversational responses
"""

from typing import Dict, List, Any, Optional
from datetime import datetime
import json

class ResponseFormatter:
    """Format technical responses into natural language"""

    def __init__(self):
        self.currency_symbol = "$"  # Can be configured

    def format_ml_response(self, ml_data: Dict, analysis_type: str, lang: str = "en") -> str:
        """Format ML responses based on type"""

        if analysis_type == "predict":
            return self._format_predictions(ml_data, lang)
        elif analysis_type == "budget":
            return self._format_budget(ml_data, lang)
        elif analysis_type == "patterns":
            return self._format_patterns(ml_data, lang)
        else:
            return self._format_generic(ml_data, lang)

    def _format_predictions(self, data: Dict, lang: str) -> str:
        """Format spending predictions into natural language"""

        predictions = data.get('predictions', [])
        confidence = data.get('confidence', 0)
        timeframe = data.get('timeframe', 'weekly')

        if not predictions:
            if lang == "zh":
                return "抱歉，我暂时无法生成预测。请确保您有足够的历史数据。"
            return "I couldn't generate predictions at this time. Please ensure you have sufficient transaction history."

        if lang == "zh":
            response = f"根据您的消费模式分析（置信度 {confidence:.0%}）：\n\n"

            for i, pred in enumerate(predictions[:2], 1):  # Show max 2 predictions
                amount = pred.get('predicted_amount', 0)
                lower = pred.get('lower_bound', 0)
                upper = pred.get('upper_bound', 0)

                if timeframe == 'weekly':
                    period_desc = f"第{i}周"
                elif timeframe == 'monthly':
                    period_desc = f"第{i}个月"
                else:
                    period_desc = f"第{i}天"

                response += f"📊 {period_desc}预测支出: {self.currency_symbol}{amount:.0f}\n"

                # Add natural insight instead of raw bounds
                if amount > 0:
                    if upper - lower > amount * 0.5:
                        response += "   （支出可能有较大波动）\n"
                    else:
                        response += "   （预计相对稳定）\n"
                else:
                    response += "   （预计支出很少或没有）\n"

            # Add recommendation
            if predictions[0].get('predicted_amount', 0) > 500:
                response += "\n💡 建议：预计支出较高，记得预留足够预算。"
            else:
                response += "\n💡 建议：支出预测较低，保持良好的节省习惯！"

        else:  # English
            response = f"Based on your spending patterns (confidence: {confidence:.0%}):\n\n"

            for i, pred in enumerate(predictions[:2], 1):  # Show max 2 predictions
                amount = pred.get('predicted_amount', 0)
                lower = pred.get('lower_bound', 0)
                upper = pred.get('upper_bound', 0)

                if timeframe == 'weekly':
                    period_desc = f"Week {i}"
                elif timeframe == 'monthly':
                    period_desc = f"Month {i}"
                else:
                    period_desc = f"Day {i}"

                response += f"📊 {period_desc}: {self.currency_symbol}{amount:.0f} expected\n"

                # Add natural insight
                if amount > 0:
                    if upper - lower > amount * 0.5:
                        response += "   (May vary significantly)\n"
                    else:
                        response += "   (Likely to be stable)\n"
                else:
                    response += "   (Minimal or no spending expected)\n"

            # Add recommendation
            if predictions[0].get('predicted_amount', 0) > 500:
                response += "\n💡 Tip: Higher spending expected - ensure adequate funds."
            else:
                response += "\n💡 Tip: Low spending predicted - great job saving!"

        return response

    def _format_budget(self, data: Dict, lang: str) -> str:
        """Format budget recommendations into natural language"""

        categories = data.get('categories', [])
        total = data.get('total_budget', 0)

        if not categories:
            if lang == "zh":
                return "暂时无法生成预算建议。请添加更多交易记录。"
            return "Unable to generate budget recommendations. Please add more transactions."

        # Sort by amount and get top categories
        sorted_cats = sorted(categories, key=lambda x: x['amount'], reverse=True)
        top_cats = sorted_cats[:5]  # Show top 5

        if lang == "zh":
            response = f"📋 您的个性化预算建议（每月）：\n\n"
            response += f"💰 总预算: {self.currency_symbol}{total:.0f}\n\n"
            response += "主要类别：\n"

            for cat in top_cats:
                name = self._translate_category(cat['category'], 'zh')
                amount = cat['amount']

                # Add emoji for categories
                emoji = self._get_category_emoji(cat['category'])
                response += f"{emoji} {name}: {self.currency_symbol}{amount:.0f}\n"

                # Add contextual advice based on amount
                if cat['activity_level'] == 'inactive':
                    response += "   很少使用 - 可以考虑减少\n"
                elif amount > total * 0.3:
                    response += "   占比较大 - 注意控制\n"

            # Add summary advice
            response += "\n💡 建议：重点关注占比最大的类别，适当调整可以更好地控制支出。"

        else:  # English
            response = f"📋 Your Personalized Monthly Budget:\n\n"
            response += f"💰 Total: {self.currency_symbol}{total:.0f}\n\n"
            response += "Key Categories:\n"

            for cat in top_cats:
                name = cat['category']
                amount = cat['amount']

                # Add emoji for categories
                emoji = self._get_category_emoji(cat['category'])
                response += f"{emoji} {name}: {self.currency_symbol}{amount:.0f}\n"

                # Add contextual advice
                if cat['activity_level'] == 'inactive':
                    response += "   Rarely used - consider reducing\n"
                elif amount > total * 0.3:
                    response += "   Large portion - monitor closely\n"

            # Add summary advice
            response += "\n💡 Tip: Focus on your largest spending categories for the most impact on your budget."

        return response

    def _format_patterns(self, data: Dict, lang: str) -> str:
        """Format spending patterns into natural language"""

        recurrences = data.get('recurrences', [])
        spikes = data.get('spikes', [])
        insights = data.get('insights', [])
        volatility = data.get('volatility', {})

        if lang == "zh":
            response = "📈 您的消费模式分析：\n\n"

            # Recurrences
            if recurrences:
                response += "🔄 定期支出：\n"
                for rec in recurrences[:3]:
                    cat = self._translate_category(rec['category'], 'zh')
                    pattern = self._translate_pattern(rec['pattern'], 'zh')
                    response += f"• {cat} {pattern}出现\n"
            else:
                response += "🔄 没有检测到明显的定期支出模式\n"

            # Spikes
            if spikes:
                recent_spikes = [s for s in spikes if s.get('recent', False)]
                if recent_spikes:
                    response += f"\n⚠️ 最近有较大支出（比平均高出很多）\n"
                else:
                    response += f"\n📊 历史上有{len(spikes)}次支出高峰\n"

            # Volatility
            high_vol = [k for k, v in volatility.items() if v > 0.5]
            if high_vol:
                response += f"\n🎲 这些类别支出波动较大：{', '.join(high_vol)}\n"

            # Insights
            if insights:
                response += "\n💡 关键发现：\n"
                for insight in insights[:2]:
                    response += f"• {self._translate_insight(insight, 'zh')}\n"

        else:  # English
            response = "📈 Your Spending Pattern Analysis:\n\n"

            # Recurrences
            if recurrences:
                response += "🔄 Recurring Expenses:\n"
                for rec in recurrences[:3]:
                    cat = rec['category']
                    pattern = rec['pattern']
                    response += f"• {cat} occurs {pattern}\n"
            else:
                response += "🔄 No clear recurring patterns detected\n"

            # Spikes
            if spikes:
                recent_spikes = [s for s in spikes if s.get('recent', False)]
                if recent_spikes:
                    response += f"\n⚠️ Recent spending spike detected\n"
                else:
                    response += f"\n📊 {len(spikes)} historical spending spikes found\n"

            # Volatility
            high_vol = [k for k, v in volatility.items() if v > 0.5]
            if high_vol:
                response += f"\n🎲 High variability in: {', '.join(high_vol)}\n"

            # Insights
            if insights:
                response += "\n💡 Key Insights:\n"
                for insight in insights[:2]:
                    response += f"• {insight}\n"

        return response

    def _format_generic(self, data: Dict, lang: str) -> str:
        """Generic formatting for other responses"""

        # Try to create a readable summary
        if isinstance(data, dict):
            if 'error' in data:
                if lang == "zh":
                    return "抱歉，处理您的请求时遇到了问题。请稍后重试。"
                return "Sorry, I encountered an issue processing your request. Please try again."

            # Format as simple key-value pairs
            response = ""
            for key, value in data.items():
                if not key.startswith('_'):  # Skip internal fields
                    response += f"{key}: {value}\n"
            return response or str(data)

        return str(data)

    def _get_category_emoji(self, category: str) -> str:
        """Get emoji for category"""
        emoji_map = {
            'Food': '🍔',
            'Transport': '🚗',
            'Shopping': '🛍️',
            'Entertainment': '🎬',
            'Home': '🏠',
            'Bills': '💰',
            'Beverage': '☕',
            'Beauty': '💄',
            'Sports': '⚽',
            'Personal': '👤',
            'Work': '💼',
            'Travel': '✈️',
            'Other': '📦'
        }
        return emoji_map.get(category, '•')

    def _translate_category(self, category: str, lang: str) -> str:
        """Translate category names"""
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
        """Translate pattern descriptions"""
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
        """Translate or simplify insights"""
        if lang != 'zh':
            return insight

        # Simple keyword-based translation
        if 'volatility' in insight.lower():
            return '支出波动较大'
        elif 'peak' in insight.lower() or 'spike' in insight.lower():
            return '存在支出高峰'
        elif 'stable' in insight.lower():
            return '支出相对稳定'
        else:
            return insight

    def format_sql_response(self, sql_data: Dict, lang: str = "en") -> str:
        """Format SQL query responses"""

        if not sql_data or sql_data.get('error'):
            if lang == "zh":
                return "无法获取数据。请检查您的查询。"
            return "Unable to retrieve data. Please check your query."

        # Handle different types of SQL responses
        data = sql_data.get('data', [])
        row_count = sql_data.get('row_count', 0)

        if row_count == 0:
            if lang == "zh":
                return "没有找到符合条件的记录。"
            return "No records found matching your criteria."

        # Format based on data structure
        if isinstance(data, list) and data:
            # If it's a simple aggregation (single row)
            if row_count == 1 and isinstance(data[0], dict):
                return self._format_single_row(data[0], lang)
            # Multiple rows
            else:
                return self._format_multiple_rows(data, lang)

        return str(data)

    def _format_single_row(self, row: Dict, lang: str) -> str:
        """Format single row results (aggregations)"""

        response = ""

        for key, value in row.items():
            # Format key names to be more readable
            readable_key = key.replace('_', ' ').title()

            # Format values
            if isinstance(value, (int, float)):
                if 'amount' in key.lower() or 'total' in key.lower() or 'sum' in key.lower():
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
        """Format multiple row results"""

        if lang == "zh":
            response = f"找到 {len(rows)} 条记录：\n\n"
        else:
            response = f"Found {len(rows)} records:\n\n"

        for i, row in enumerate(rows[:max_rows], 1):
            response += f"{i}. "

            # Extract key fields
            if 'description' in row:
                response += f"{row['description']} - "
            if 'amount' in row:
                response += f"{self.currency_symbol}{row['amount']}"
            if 'date' in row:
                response += f" ({row['date']})"

            response += "\n"

        if len(rows) > max_rows:
            if lang == "zh":
                response += f"\n...还有 {len(rows) - max_rows} 条记录"
            else:
                response += f"\n...and {len(rows) - max_rows} more"

        return response

    def _translate_field(self, field: str, lang: str) -> str:
        """Translate field names"""
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