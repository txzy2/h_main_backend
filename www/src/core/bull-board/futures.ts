import {BullBoardModule} from '@bull-board/nestjs';
import {BullMQAdapter} from '@bull-board/api/bullMQAdapter';

export const BULL_BOARD_FEATURES = [
    BullBoardModule.forFeature({
        name: 'licenses',
        adapter: BullMQAdapter
    })
];
