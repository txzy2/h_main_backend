import {BullMQAdapter} from '@bull-board/api/bullMQAdapter';
import {BullBoardModule} from '@bull-board/nestjs';

export const BULL_BOARD_FEATURES = [
    BullBoardModule.forFeature({
        name: 'licenses',
        adapter: BullMQAdapter
    }),
    BullBoardModule.forFeature({
        name: 'update-org',
        adapter: BullMQAdapter
    })
];
