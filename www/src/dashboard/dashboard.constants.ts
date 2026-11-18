/** Часовой пояс, в котором считаются «сегодня», смены и разрезы дашборда. */
export const DASHBOARD_TIME_ZONE = 'Europe/Moscow';

/** Рабочие часы, которые показываем на графике загрузки (включительно). */
export const LOAD_START_HOUR = 10;
export const LOAD_END_HOUR = 23;

/** График выручки за сегодня строим по всем часам, включая ночные чеки. */
export const REVENUE_DAY_START_HOUR = 0;
export const REVENUE_DAY_END_HOUR = 23;

export const HEATMAP_DAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'] as const;

export const REVENUE_PERIODS = [
    {key: 'today', label: 'Сегодня', days: 1},
    {key: '14d', label: '14 дней', days: 14},
    {key: '1m', label: '1 мес', days: 30},
    {key: '2m', label: '2 мес', days: 60},
    {key: '3m', label: '3 мес', days: 90}
] as const;

export type RevenuePeriodKey = (typeof REVENUE_PERIODS)[number]['key'];

export const REVENUE_PERIOD_KEYS: RevenuePeriodKey[] = REVENUE_PERIODS.map(item => item.key);

export const DEFAULT_REVENUE_PERIOD: RevenuePeriodKey = '14d';

/** Сколько истории броней загружаем для трендов, спарклайнов и heatmap. */
export const DASHBOARD_HISTORY_DAYS = 120;

export const HEATMAP_HISTORY_DAYS = 28;

/** Цель смены по умолчанию, если для менеджера не заведена запись Shift. */
export const DEFAULT_SHIFT_GOAL = 8;
