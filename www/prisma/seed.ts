/**
 * Демо-данные для дашборда.
 *
 * Сид идемпотентен:
 *  - брони с комментарием `demo-seed` пересоздаются;
 *  - столы создаются только если у точки их ещё нет;
 *  - смены на сегодня создаются только если их ещё нет;
 *  - демо-сотрудники обновляются по ext_id.
 *
 * Запуск: bun prisma/seed.ts
 */
import 'dotenv/config';
import {Activity, BookingStatus, Prisma, PrismaClient} from '@prisma/client';
import {PrismaPg} from '@prisma/adapter-pg';

const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;
const MINUTE_MS = 60 * 1000;
/** Москва живёт в UTC+3 без перехода на летнее время. */
const MSK_OFFSET_MS = 3 * HOUR_MS;

const HISTORY_DAYS = 90;
const TABLES_COUNT = 18;
const DEMO_BOOKING_MARKER = 'demo-seed';

const adapter = new PrismaPg({
    connectionString: process.env.DATABASE_URL as string
});
const prisma = new PrismaClient({adapter});

let randomState = 20261112;

function random(): number {
    randomState = (randomState * 1664525 + 1013904223) >>> 0;
    return randomState / 4294967296;
}

function randomInt(min: number, max: number): number {
    return min + Math.floor(random() * (max - min + 1));
}

function pick<T>(items: T[]): T {
    return items[Math.floor(random() * items.length)];
}

function startOfMoscowDay(date: Date): Date {
    const shifted = new Date(date.getTime() + MSK_OFFSET_MS);

    return new Date(
        Date.UTC(
            shifted.getUTCFullYear(),
            shifted.getUTCMonth(),
            shifted.getUTCDate()
        ) - MSK_OFFSET_MS
    );
}

function atMoscowTime(
    dayStart: Date,
    hour: number,
    minute = 0,
    dayOffset = 0
): Date {
    return new Date(
        dayStart.getTime() + dayOffset * DAY_MS + hour * HOUR_MS + minute * MINUTE_MS
    );
}

const GUEST_NAMES = [
    'Сергей Петров',
    'Ольга Смирнова',
    'Иван Морозов',
    'Анна Волкова',
    'Дмитрий Кузнецов',
    'Елена Соколова',
    'Максим Орлов',
    'Наталья Крылова',
    'Артём Лебедев',
    'Юлия Никитина',
    'Павел Фролов',
    'Виктория Зайцева',
    'Роман Гусев',
    'Ксения Белова',
    'Алексей Тарасов',
    'Марина Комарова',
    'Никита Сорокин',
    'Татьяна Крылова',
    'Андрей Козлов',
    'Дарья Лебедева'
];

interface Guest {
    name: string;
    phone: string;
}

let guestCounter = 0;

function createGuest(): Guest {
    const name = GUEST_NAMES[guestCounter % GUEST_NAMES.length];
    const phone = `7917${String(1000000 + guestCounter)}`;

    guestCounter += 1;

    return {name, phone};
}

function pickGuest(knownGuests: Guest[]): Guest {
    // Примерно четверть гостей — новые, остальные возвращаются.
    if (!knownGuests.length || random() < 0.25) {
        const guest = createGuest();
        knownGuests.push(guest);
        return guest;
    }

    return pick(knownGuests);
}

const DEMO_STAFF = [
    {
        extId: 'demo-staff-alina',
        login: 'demo_alina',
        name: 'Алина Кузнецова',
        phoneNumber: '79170000001',
        position: 'Официант'
    },
    {
        extId: 'demo-staff-maria',
        login: 'demo_maria',
        name: 'Мария Соколова',
        phoneNumber: '79170000002',
        position: 'Кальянный мастер'
    },
    {
        extId: 'demo-staff-dmitry',
        login: 'demo_dmitry',
        name: 'Дмитрий Орлов',
        phoneNumber: '79170000003',
        position: 'Кальянный мастер'
    },
    {
        extId: 'demo-staff-igor',
        login: 'demo_igor',
        name: 'Игорь Лебедев',
        phoneNumber: '79170000004',
        position: 'Бармен'
    },
    {
        extId: 'demo-staff-svetlana',
        login: 'demo_svetlana',
        name: 'Светлана Егорова',
        phoneNumber: '79170000005',
        position: 'Официант'
    }
] as const;

async function main() {
    console.log('🌱 Seeding dashboard demo data...');

    const org = await prisma.organization.findFirst({
        where: {status: Activity.Active},
        orderBy: {id: 'asc'}
    });

    if (!org) {
        throw new Error('Нет активной организации. Сначала пройди онбординг.');
    }

    const location = await prisma.location.findFirst({
        where: {orgId: org.id, status: Activity.Active},
        orderBy: {id: 'asc'}
    });

    if (!location) {
        throw new Error('Нет активной точки у организации. Сначала добавь точку.');
    }

    let tables = await prisma.locationTables.findMany({
        where: {locationId: location.id},
        orderBy: {id: 'asc'}
    });

    if (!tables.length) {
        for (let index = 0; index < TABLES_COUNT; index++) {
            await prisma.locationTables.create({
                data: {
                    locationId: location.id,
                    name: `Стол ${index + 1}`
                }
            });
        }

        tables = await prisma.locationTables.findMany({
            where: {locationId: location.id},
            orderBy: {id: 'asc'}
        });

        await prisma.location.update({
            where: {id: location.id},
            data: {activePlaces: tables.length}
        });
    }

    console.log(`✓ Точка: ${location.name}, столов: ${tables.length}`);

    const existingUsers = await prisma.user.findMany({where: {orgId: org.id}});
    const managerUser =
        existingUsers.find(user => user.login === 'manager') ?? existingUsers[0];
    const adminUser = existingUsers.find(user => user.login === 'txzy2');

    if (!managerUser) {
        throw new Error('В организации нет пользователей. Сначала зарегистрируй менеджера.');
    }

    await prisma.user.update({
        where: {id: managerUser.id},
        data: {position: 'Управляющий', updatedAt: new Date()}
    });

    if (adminUser) {
        await prisma.user.update({
            where: {id: adminUser.id},
            data: {position: 'Администратор', updatedAt: new Date()}
        });
    }

    const staff = [managerUser];

    for (const employee of DEMO_STAFF) {
        const user = await prisma.user.upsert({
            where: {extId: employee.extId},
            update: {
                name: employee.name,
                phoneNumber: employee.phoneNumber,
                position: employee.position,
                orgId: org.id,
                updatedAt: new Date()
            },
            create: {
                login: employee.login,
                name: employee.name,
                phoneNumber: employee.phoneNumber,
                position: employee.position,
                extId: employee.extId,
                orgId: org.id
            }
        });

        staff.push(user);
    }

    console.log(`✓ Сотрудников для демо: ${staff.length}`);

    const now = new Date();
    const startToday = startOfMoscowDay(now);
    const endToday = new Date(startToday.getTime() + DAY_MS);

    const shiftsToday = await prisma.shift.count({
        where: {orgId: org.id, startsAt: {gte: startToday, lt: endToday}}
    });

    if (shiftsToday === 0) {
        const shiftTemplates = [
            {user: managerUser, startHour: 10, endHour: 22, goal: 8},
            {
                user: staff.find(user => user.extId === 'demo-staff-alina'),
                startHour: 12,
                endHour: 24,
                goal: 6
            },
            {
                user: staff.find(user => user.extId === 'demo-staff-maria'),
                startHour: 14,
                endHour: 26,
                goal: 6
            },
            {
                user: staff.find(user => user.extId === 'demo-staff-dmitry'),
                startHour: 22,
                endHour: 26,
                goal: 5
            },
            {
                user: staff.find(user => user.extId === 'demo-staff-igor'),
                startHour: 18,
                endHour: 26,
                goal: 5
            },
            {
                user: staff.find(user => user.extId === 'demo-staff-svetlana'),
                startHour: 16,
                endHour: 23,
                goal: 5
            }
        ];

        for (const template of shiftTemplates) {
            if (!template.user) continue;

            await prisma.shift.create({
                data: {
                    userId: template.user.id,
                    orgId: org.id,
                    startsAt: atMoscowTime(startToday, template.startHour),
                    endsAt: atMoscowTime(startToday, template.endHour),
                    bookingsGoal: template.goal
                }
            });
        }

        console.log(`✓ Созданы смены на сегодня: ${shiftTemplates.length}`);
    } else {
        console.log(`⚠ Смены на сегодня уже есть (${shiftsToday}) — не трогаю`);
    }

    const removed = await prisma.booking.deleteMany({
        where: {comment: {startsWith: DEMO_BOOKING_MARKER}}
    });

    if (removed.count) {
        console.log(`✓ Удалены старые демо-брони: ${removed.count}`);
    }

    const bookings: Prisma.BookingCreateManyInput[] = [];
    const knownGuests: Guest[] = [];

    for (let dayOffset = -(HISTORY_DAYS - 1); dayOffset <= 0; dayOffset++) {
        const dayStart = new Date(startToday.getTime() + dayOffset * DAY_MS);
        const isPastDay = dayOffset < 0;
        const bookingsPerDay = randomInt(12, 21);
        const cancelledIndex = random() < 0.8 ? randomInt(0, bookingsPerDay - 1) : -1;

        for (let index = 0; index < bookingsPerDay; index++) {
            const scheduledAt = atMoscowTime(
                dayStart,
                randomInt(12, 23),
                random() < 0.5 ? 0 : 30
            );
            const guest = pickGuest(knownGuests);
            const employee = pick(staff);
            const table = pick(tables);
            const guestsCount = randomInt(2, 8);
            const seatedAt = new Date(
                scheduledAt.getTime() + randomInt(5, 15) * MINUTE_MS
            );
            const completedAt = new Date(
                seatedAt.getTime() + randomInt(90, 150) * MINUTE_MS
            );
            const amount = 1200 + guestsCount * 350 + randomInt(0, 2500);
            const rating = random() < 0.6 ? 5 : 4;

            if (index === cancelledIndex) {
                bookings.push({
                    locationId: location.id,
                    tableId: table.id,
                    userExtId: employee.extId,
                    guestName: guest.name,
                    guestPhone: guest.phone,
                    guestsCount,
                    status: BookingStatus.Cancelled,
                    scheduledAt,
                    seatedAt: null,
                    completedAt: null,
                    amount: 0,
                    rating: null,
                    comment: DEMO_BOOKING_MARKER
                });
                continue;
            }

            if (isPastDay || completedAt.getTime() <= now.getTime()) {
                bookings.push({
                    locationId: location.id,
                    tableId: table.id,
                    userExtId: employee.extId,
                    guestName: guest.name,
                    guestPhone: guest.phone,
                    guestsCount,
                    status: BookingStatus.Completed,
                    scheduledAt,
                    seatedAt,
                    completedAt,
                    amount,
                    rating,
                    comment: DEMO_BOOKING_MARKER
                });
                continue;
            }

            bookings.push({
                locationId: location.id,
                tableId: table.id,
                userExtId: employee.extId,
                guestName: guest.name,
                guestPhone: guest.phone,
                guestsCount,
                status: BookingStatus.Confirmed,
                scheduledAt,
                seatedAt: scheduledAt.getTime() <= now.getTime() ? scheduledAt : null,
                completedAt: null,
                amount: 0,
                rating: null,
                comment: DEMO_BOOKING_MARKER
            });
        }
    }

    // Гарантируем «за столом» и «ожидаются» в текущий момент, даже если
    // сетка броней на сегодня не попала в текущий час.
    const extraBookings: Array<{
        scheduledAt: Date;
        status: BookingStatus;
        seatedAt: Date | null;
    }> = [
        {scheduledAt: new Date(now.getTime() - 20 * MINUTE_MS), status: BookingStatus.Confirmed, seatedAt: new Date(now.getTime() - 20 * MINUTE_MS)},
        {scheduledAt: new Date(now.getTime() - 50 * MINUTE_MS), status: BookingStatus.Confirmed, seatedAt: new Date(now.getTime() - 50 * MINUTE_MS)},
        {scheduledAt: new Date(now.getTime() + 60 * MINUTE_MS), status: BookingStatus.Confirmed, seatedAt: null},
        {scheduledAt: new Date(now.getTime() + 120 * MINUTE_MS), status: BookingStatus.Confirmed, seatedAt: null}
    ];

    for (const extra of extraBookings) {
        if (extra.scheduledAt < startToday || extra.scheduledAt >= endToday) continue;

        const guest = knownGuests.length ? pick(knownGuests) : pickGuest(knownGuests);
        const employee = pick(staff);
        const table = pick(tables);

        bookings.push({
            locationId: location.id,
            tableId: table.id,
            userExtId: employee.extId,
            guestName: guest.name,
            guestPhone: guest.phone,
            guestsCount: randomInt(2, 6),
            status: extra.status,
            scheduledAt: extra.scheduledAt,
            seatedAt: extra.seatedAt,
            completedAt: null,
            amount: 0,
            rating: null,
            comment: DEMO_BOOKING_MARKER
        });
    }

    await prisma.booking.createMany({data: bookings});

    console.log(`✓ Создано демо-броней: ${bookings.length}`);
    console.log(`  история: ${HISTORY_DAYS} дней, организация: ${org.name}`);
    console.log('🎉 Seeding finished successfully!');
}

main()
    .catch(error => {
        console.error('❌ Seeding failed:', error);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
