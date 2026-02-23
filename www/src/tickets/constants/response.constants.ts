export const SUCCESS_GET_TICKETS_RESPONSE = {
    success: true,
    data: [
        {
            ticket_id: 'def8acee-22fb-42c5-adc2-2416ae65be58',
            org_id: 1,
            status: 'Pending',
            reason: 'test',
            requested_data: {
                name: 'new Name'
            },
            type_name: 'Обновление организации',
            created_at: '2026-02-23T20:10:48.813Z'
        }
    ]
};

export const CREATE_ORG_TICKET_RESPONSE_EXAMPLE = {
    success: true,
    data: {
        ticket_id: 'uuid-1234-5678-90ab-cdef',
        message: 'Заявка на обновление организации успешно создана'
    }
};
