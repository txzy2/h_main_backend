import {FloorPlanLayout, FloorPlanTableInput} from './floor-plan.types';

export function normalizeFloorPlanLayout(value: unknown): FloorPlanLayout {
    const raw =
        value && typeof value === 'object'
            ? (value as Partial<FloorPlanLayout>)
            : {};
    const canvas = raw.canvas ?? {width: 1200, height: 800};
    const tables = Array.isArray(raw.tables)
        ? raw.tables.map((table, index) => normalizeFloorPlanTable(table, index))
        : [];

    return {
        version: typeof raw.version === 'number' ? raw.version : 1,
        canvas: {
            width: Number(canvas.width) || 1200,
            height: Number(canvas.height) || 800
        },
        tables,
        zones: Array.isArray(raw.zones) ? raw.zones : [],
        objects: Array.isArray(raw.objects) ? raw.objects : []
    };
}

export function normalizeFloorPlanTable(
    value: unknown,
    index: number
): FloorPlanTableInput {
    const raw =
        value && typeof value === 'object'
            ? (value as Partial<FloorPlanTableInput>)
            : {};

    return {
        id: typeof raw.id === 'string' && raw.id ? raw.id : `table-${index + 1}`,
        tableId: typeof raw.tableId === 'number' ? raw.tableId : null,
        name: typeof raw.name === 'string' && raw.name ? raw.name : `Стол ${index + 1}`,
        seats: typeof raw.seats === 'number' ? raw.seats : 4,
        x: typeof raw.x === 'number' ? raw.x : 0,
        y: typeof raw.y === 'number' ? raw.y : 0,
        width: typeof raw.width === 'number' ? raw.width : 88,
        height: typeof raw.height === 'number' ? raw.height : 88,
        rotation: typeof raw.rotation === 'number' ? raw.rotation : 0,
        shape: raw.shape === 'rect' ? 'rect' : 'round',
        color: typeof raw.color === 'string' ? raw.color : null
    };
}

/**
 * Ищет свободную позицию для нового стола на существующем плане.
 * Раскладка существующих столов не меняется.
 */
export function findFreeTablePosition(
    layout: FloorPlanLayout,
    width = 88,
    height = 88
): {x: number; y: number} {
    const margin = 16;
    const step = 110;
    const maxX = layout.canvas.width - width - margin;
    const maxY = layout.canvas.height - height - margin;

    for (let y = margin; y <= maxY; y += step) {
        for (let x = margin; x <= maxX; x += step) {
            const overlaps = layout.tables.some(table => {
                return (
                    x < table.x + table.width + margin &&
                    x + width + margin > table.x &&
                    y < table.y + table.height + margin &&
                    y + height + margin > table.y
                );
            });

            if (!overlaps) return {x, y};
        }
    }

    return {x: margin, y: margin};
}
