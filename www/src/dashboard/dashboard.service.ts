import {ConflictException, Inject, Injectable} from '@nestjs/common';
import {Activity, BookingStatus} from '@prisma/client';
import {USER_ROLES} from '@/common/constants/roles.constants';
import {ApiErrors} from '@/common/errors/api-errors';
import {AppLoggerService} from '@/common/logger/logger.service';
import {RedisService} from '@/redis/redis.service';
import {AuthUser} from '@/types';
import {
    DASHBOARD_HISTORY_DAYS,
    DEFAULT_REVENUE_PERIOD,
    DEFAULT_SHIFT_GOAL,
    HEATMAP_DAYS,
    HEATMAP_HISTORY_DAYS,
    LOAD_END_HOUR,
    LOAD_START_HOUR,
    REVENUE_DAY_END_HOUR,
    REVENUE_DAY_START_HOUR,
    REVENUE_PERIODS,
    RevenuePeriodKey
} from './dashboard.constants';
import {DASHBOARD_REPOSITORY, type DashboardRepositoryInterface} from './dashboard.repository';
import {TeamQueryDto} from './dto/team-query.dto';
import {
    BookingBoardItem,
    BookingsBoard,
    DashboardBooking,
    DashboardKpi,
    DashboardLocation,
    DashboardShift,
    DashboardSummary,
    DashboardUser,
    EmployeeBookingStat,
    EmployeeStat,
    HeatmapData,
    HourLoadPoint,
    LocationStat,
    ManagerShiftSummary,
    RevenuePeriod,
    RevenuePoint,
    ShiftBooking,
    ShiftBookingStatus,
    ShiftStaff,
    ShiftStaffStatus,
    TeamResponse,
    TeamRow,
    TeamSortKey
} from './dashboard.types';
import {
    addDays,
    addMonths,
    formatDayLabel,
    formatHourLabel,
    formatTime,
    formatTimeRange,
    getHour,
    getWeekdayIndex,
    getZonedParts,
    startOfZonedDay,
    startOfZonedMonth
} from './dashboard.time';

const MINUTE_MS = 60 * 1000;
const HOUR_MS = 60 * MINUTE_MS;

const CACHE_KEY_PREFIX = 'h_main:dashboard:v4';
const DEFAULT_CACHE_TTL_SECONDS = 10 * 60;

@Injectable()
export class DashboardService {
    private readonly cacheTtlSeconds: number;

    public constructor(
        @Inject(DASHBOARD_REPOSITORY) private readonly repository: DashboardRepositoryInterface,
        private readonly redis: RedisService,
        private readonly logger: AppLoggerService
    ) {
        this.logger.setContext(DashboardService.name);

        const ttl = Number(process.env.DASHBOARD_CACHE_TTL_SECONDS ?? DEFAULT_CACHE_TTL_SECONDS);
        this.cacheTtlSeconds = Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_CACHE_TTL_SECONDS;
    }

    public async getSummary(
        authUser: AuthUser,
        refresh = false
    ): Promise<DashboardSummary> {
        const {org} = await this.getContext(authUser);

        return this.withCache(this.summaryKey(org.id), refresh, () => this.computeSummary(org.id));
    }

    public async getRevenue(
        authUser: AuthUser,
        periodKey: RevenuePeriodKey = DEFAULT_REVENUE_PERIOD,
        refresh = false
    ): Promise<RevenuePeriod> {
        const {org} = await this.getContext(authUser);

        return this.withCache(this.revenueKey(org.id, periodKey), refresh, () =>
            this.computeRevenue(org.id, periodKey)
        );
    }

    public async getBookingsBoard(user: AuthUser): Promise<BookingsBoard> {
        const {user: currentUser, org} = await this.getContext(user);
        const now = new Date();
        const startToday = startOfZonedDay(now);
        const endToday = addDays(startToday, 1);

        const [bookings, users, completedToday] = await Promise.all([
            this.repository.findBookings(org.id, startToday, endToday),
            this.repository.findUsers(org.id),
            this.repository.findCompleted(org.id, startToday, endToday)
        ]);

        const statuses = new Map<number, ShiftBookingStatus>();
        for (const booking of bookings) {
            statuses.set(booking.id, this.toShiftStatus(booking, now));
        }

        const usersByExtId = new Map(users.map(item => [item.extId, item]));
        const sortedBookings = bookings.slice().sort((left, right) => {
            const leftMine = left.userExtId === currentUser.extId ? 0 : 1;
            const rightMine = right.userExtId === currentUser.extId ? 0 : 1;

            if (leftMine !== rightMine) return leftMine - rightMine;

            return left.scheduledAt.getTime() - right.scheduledAt.getTime();
        });

        const boardBookings: BookingBoardItem[] = sortedBookings.map(booking => ({
            id: String(booking.id),
            time: formatTime(booking.scheduledAt),
            endTime: formatTime(
                new Date(booking.scheduledAt.getTime() + booking.durationMinutes * MINUTE_MS)
            ),
            durationMinutes: booking.durationMinutes,
            locationName: booking.locationName,
            guestName: booking.guestName ?? 'Гость',
            guests: booking.guestsCount,
            table: booking.tableName ?? 'Без стола',
            status: statuses.get(booking.id) ?? 'Ожидается',
            phone: booking.guestPhone ?? undefined,
            isMine: booking.userExtId === currentUser.extId || undefined,
            managerName: usersByExtId.get(booking.userExtId)?.name ?? 'Неизвестный менеджер'
        }));

        const activeBookings = this.active(bookings);
        const revenueBookings = this.revenue(completedToday);
        const cancellations = bookings.filter(
            booking => booking.status === BookingStatus.Cancelled
        );
        const isAdmin =
            user.role === USER_ROLES.ADMIN || user.role === USER_ROLES.SUPER_USER;
        const personalActive = activeBookings.filter(
            booking => booking.userExtId === currentUser.extId
        );
        const personalRevenue = revenueBookings.filter(
            booking => booking.userExtId === currentUser.extId
        );
        const personalCancellations = cancellations.filter(
            booking => booking.userExtId === currentUser.extId
        );
        const personalExpected = boardBookings.filter(
            booking => booking.isMine && booking.status === 'Ожидается'
        ).length;

        return {
            generatedAt: now.toISOString(),
            date: startToday.toISOString(),
            summary: isAdmin
                ? {
                      bookings: activeBookings.length,
                      guests: this.sumGuests(activeBookings),
                      revenue: this.sumAmount(revenueBookings),
                      cancellations: cancellations.length,
                      expectedArrivals: [...statuses.values()].filter(
                          status => status === 'Ожидается'
                      ).length
                  }
                : {
                      // Менеджеру показываем только его личные показатели.
                      bookings: personalActive.length,
                      guests: this.sumGuests(personalActive),
                      revenue: this.sumAmount(personalRevenue),
                      cancellations: personalCancellations.length,
                      expectedArrivals: personalExpected
                  },
            bookings: boardBookings,
            employees: isAdmin
                ? this.buildEmployeeBookingStats(users, bookings, completedToday)
                : []
        };
    }

    public async getTeam(user: AuthUser, query: TeamQueryDto): Promise<TeamResponse> {
        const {org} = await this.getContext(user);
        const now = new Date();
        const startToday = startOfZonedDay(now);
        const endToday = addDays(startToday, 1);
        const monthStart = startOfZonedMonth(now);

        const [teamUsers, bookings, completed, shifts] = await Promise.all([
            this.repository.findTeamUsers(org.id),
            this.repository.findBookings(org.id, monthStart, endToday),
            this.repository.findCompleted(org.id, monthStart, endToday),
            this.repository.findShifts(org.id, startToday, endToday)
        ]);

        const activeBookings = this.active(bookings);
        const revenueBookings = this.revenue(completed);
        const cancellationBookings = bookings.filter(
            booking => booking.status === BookingStatus.Cancelled
        );

        const rows: TeamRow[] = teamUsers.map(teamUser => {
            const userBookings = activeBookings.filter(
                booking => booking.userExtId === teamUser.extId
            );
            const userRevenueBookings = revenueBookings.filter(
                booking => booking.userExtId === teamUser.extId
            );
            const revenue = this.sumAmount(userRevenueBookings);
            const activeShift = shifts.find(
                shift =>
                    shift.userExtId === teamUser.extId &&
                    shift.actualStartedAt &&
                    !shift.actualEndedAt
            );

            return {
                id: teamUser.extId,
                name: teamUser.name,
                login: teamUser.login,
                phone: teamUser.phone,
                position: teamUser.position ?? 'Сотрудник',
                bookings: userBookings.length,
                guests: this.sumGuests(userBookings),
                revenue,
                averageCheck: this.averageCheck(revenue, userRevenueBookings.length),
                cancellations: cancellationBookings.filter(
                    booking => booking.userExtId === teamUser.extId
                ).length,
                isOnShift: Boolean(activeShift),
                shiftStartedAt: activeShift?.actualStartedAt?.toISOString() ?? null,
                createdAt: teamUser.createdAt.toISOString()
            };
        });

        const search = query.search?.trim().toLowerCase();
        const filtered = search
            ? rows.filter(row =>
                  [row.name, row.login, row.phone, row.position].some(value =>
                      value.toLowerCase().includes(search)
                  )
              )
            : rows;

        const sort = query.sort ?? 'name';
        const order = query.order ?? 'asc';
        const sorted = filtered
            .slice()
            .sort((left, right) => this.compareTeamRows(left, right, sort, order));

        const pageSize = Math.min(100, Math.max(1, query.pageSize ?? 10));
        const total = sorted.length;
        const totalPages = Math.max(1, Math.ceil(total / pageSize));
        const page = Math.min(Math.max(1, query.page ?? 1), totalPages);
        const items = sorted.slice((page - 1) * pageSize, page * pageSize);

        return {
            generatedAt: now.toISOString(),
            period: {from: monthStart.toISOString(), to: endToday.toISOString()},
            summary: {
                employees: rows.length,
                onShift: rows.filter(row => row.isOnShift).length,
                bookings: rows.reduce((sum, row) => sum + row.bookings, 0),
                revenue: rows.reduce((sum, row) => sum + row.revenue, 0)
            },
            items,
            total,
            page,
            pageSize,
            totalPages,
            sort,
            order
        };
    }

    public async getShift(
        authUser: AuthUser,
        refresh = false
    ): Promise<ManagerShiftSummary> {
        const {user, org} = await this.getContext(authUser);
        const version = await this.repository.findShiftCacheVersion(org.id, user.id);

        return this.withCache(
            this.shiftKey(org.id, user.extId, version),
            refresh,
            () => this.computeShift(org.id, user.extId)
        );
    }

    public async startShift(authUser: AuthUser): Promise<ManagerShiftSummary> {
        const {user, org} = await this.getContext(authUser);
        const now = new Date();
        const startToday = startOfZonedDay(now);
        const endToday = addDays(startToday, 1);
        const shifts = await this.repository.findShifts(org.id, startToday, endToday);
        const ownShifts = shifts.filter(shift => shift.userId === user.id);
        const activeShift = ownShifts.find(
            shift => shift.actualStartedAt && !shift.actualEndedAt
        );

        if (!activeShift) {
            const plannedShift = ownShifts.find(
                shift =>
                    !shift.actualStartedAt &&
                    shift.startsAt.getTime() <= now.getTime() &&
                    (!shift.endsAt || shift.endsAt.getTime() > now.getTime())
            );

            if (plannedShift) {
                await this.repository.startShift(plannedShift.id, now);
            } else {
                const previousShift = ownShifts[ownShifts.length - 1];

                await this.repository.createShift({
                    userId: user.id,
                    orgId: org.id,
                    startsAt: now,
                    endsAt: null,
                    bookingsGoal: previousShift?.bookingsGoal || DEFAULT_SHIFT_GOAL,
                    actualStartedAt: now
                });
            }
        }

        this.logger.log(`Shift started: user=${user.extId}, orgId=${org.id}`);

        return this.getShift(authUser, true);
    }

    public async finishShift(authUser: AuthUser): Promise<ManagerShiftSummary> {
        const {user, org} = await this.getContext(authUser);
        const now = new Date();
        const startToday = startOfZonedDay(now);
        const endToday = addDays(startToday, 1);
        const shifts = await this.repository.findShifts(org.id, startToday, endToday);
        const activeShift = shifts.find(
            shift =>
                shift.userId === user.id &&
                shift.actualStartedAt &&
                !shift.actualEndedAt
        );

        if (!activeShift) {
            throw new ConflictException(ApiErrors.SHIFT_NOT_STARTED);
        }

        await this.repository.finishShift(activeShift.id, now);
        this.logger.log(`Shift finished: user=${user.extId}, orgId=${org.id}`);

        return this.getShift(authUser, true);
    }

    private async computeSummary(orgId: number): Promise<DashboardSummary> {
        const now = new Date();
        const startToday = startOfZonedDay(now);
        const endToday = addDays(startToday, 1);
        const startYesterday = addDays(startToday, -1);
        const monthStart = startOfZonedMonth(now);
        const prevMonthStart = addMonths(monthStart, -1);
        const dayOfMonth = getZonedParts(now).day;
        const prevMonthEnd = addDays(prevMonthStart, dayOfMonth);
        const historyStart = addDays(startToday, -(DASHBOARD_HISTORY_DAYS - 1));
        const from = historyStart < prevMonthStart ? historyStart : prevMonthStart;

        const [bookings, locations, users] = await Promise.all([
            this.repository.findBookings(orgId, from, endToday),
            this.repository.findLocations(orgId),
            this.repository.findUsers(orgId)
        ]);

        const totalTables = this.sumTables(locations);
        const firstVisits = this.buildFirstVisits(bookings);
        const sparkStart = addDays(startToday, -6);
        const guestPhones = [
            ...new Set(
                this.active(this.inRange(bookings, sparkStart, endToday))
                    .map(booking => booking.guestPhone)
                    .filter((phone): phone is string => Boolean(phone))
            )
        ];
        const firstVisitsFromDb = await this.repository.findGuestFirstVisits(
            orgId,
            guestPhones
        );

        for (const [phone, firstVisit] of firstVisitsFromDb) {
            firstVisits.set(phone, firstVisit);
        }

        const todayBookings = this.inRange(bookings, startToday, endToday);
        const yesterdayBookings = this.inRange(bookings, startYesterday, startToday);
        const monthBookings = this.inRange(bookings, monthStart, endToday);

        const todayActive = this.active(todayBookings);
        const yesterdayActive = this.active(yesterdayBookings);
        const todayRevenue = this.revenue(
            this.completedInRange(bookings, startToday, endToday)
        );
        const yesterdayRevenue = this.revenue(
            this.completedInRange(bookings, startYesterday, startToday)
        );
        const monthRevenue = this.revenue(
            this.completedInRange(bookings, monthStart, endToday)
        );

        const revenueToday = this.sumAmount(todayRevenue);
        const revenueYesterday = this.sumAmount(yesterdayRevenue);
        const revenueMonth = this.sumAmount(monthRevenue);

        const bookingsToday = todayActive.length;
        const bookingsYesterday = yesterdayActive.length;
        const guestsToday = this.sumGuests(todayActive);
        const guestsYesterday = this.sumGuests(yesterdayActive);

        const averageCheck = this.averageCheck(revenueToday, todayRevenue.length);
        const averageCheckYesterday = this.averageCheck(
            revenueYesterday,
            yesterdayRevenue.length
        );

        const occupancy = this.occupancy(todayActive, totalTables);
        const occupancyYesterday = this.occupancy(yesterdayActive, totalTables);

        const newGuestsToday = this.countNewGuests(todayActive, firstVisits, startToday);
        const newGuestsYesterday = this.countNewGuests(
            yesterdayActive,
            firstVisits,
            startYesterday
        );

        const todayGuests = this.guestKeys(todayActive);
        const returningRate = todayGuests.size
            ? this.round((todayGuests.size - newGuestsToday) / todayGuests.size * 100)
            : 0;

        const kpi: DashboardKpi = {
            revenueToday,
            revenueMonth,
            bookingsToday,
            guestsToday,
            averageCheck,
            occupancy,
            newGuestsToday,
            returningRate,
            revenueTrend: this.trend(revenueToday, revenueYesterday),
            bookingsTrend: this.trend(bookingsToday, bookingsYesterday),
            guestsTrend: this.trend(guestsToday, guestsYesterday),
            averageCheckTrend: this.trend(averageCheck, averageCheckYesterday),
            occupancyTrend: this.round(occupancy - occupancyYesterday),
            newGuestsTrend: this.trend(newGuestsToday, newGuestsYesterday),
            spark: this.buildSpark(
                bookings,
                firstVisits,
                startToday,
                totalTables
            )
        };

        return {
            generatedAt: now.toISOString(),
            kpi,
            loadByHour: this.buildLoadByHour(todayActive),
            heatmap: this.buildHeatmap(bookings, startToday, endToday),
            locations: this.buildLocationStats(
                locations,
                bookings,
                monthStart,
                endToday,
                prevMonthStart,
                prevMonthEnd
            ),
            employees: this.buildEmployeeStats(monthBookings, users)
        };
    }

    private async computeRevenue(
        orgId: number,
        periodKey: RevenuePeriodKey = DEFAULT_REVENUE_PERIOD
    ): Promise<RevenuePeriod> {
        const period = REVENUE_PERIODS.find(item => item.key === periodKey);

        if (!period) {
            throw new ConflictException('Неизвестный период');
        }

        const now = new Date();
        const startToday = startOfZonedDay(now);
        const endToday = addDays(startToday, 1);

        if (period.key === 'today') {
            // Запас в день нужен для чеков, закрытых после полуночи:
            // бронь вчерашняя, а completedAt уже сегодня.
            const bookings = await this.repository.findBookings(
                orgId,
                addDays(startToday, -1),
                endToday
            );

            return {
                key: period.key,
                label: period.label,
                points: this.buildHourlyRevenue(bookings, startToday, endToday)
            };
        }

        const start = addDays(startToday, -(period.days - 1));
        const bookings = await this.repository.findBookings(
            orgId,
            addDays(start, -1),
            endToday
        );
        const points: RevenuePoint[] = [];

        for (let index = 0; index < period.days; index++) {
            const dayStart = addDays(start, index);
            const dayEnd = addDays(dayStart, 1);
            const dayBookings = this.inRange(bookings, dayStart, dayEnd);
            const dayRevenue = this.revenue(
                this.completedInRange(bookings, dayStart, dayEnd)
            );

            points.push({
                date: dayStart.toISOString(),
                label: formatDayLabel(dayStart),
                revenue: this.sumAmount(dayRevenue),
                bookings: this.active(dayBookings).length
            });
        }

        return {key: period.key, label: period.label, points};
    }

    private async computeShift(
        orgId: number,
        userExtId: string
    ): Promise<ManagerShiftSummary> {
        const now = new Date();
        const startToday = startOfZonedDay(now);
        const endToday = addDays(startToday, 1);

        const [bookings, locations, shifts, completedToday] = await Promise.all([
            this.repository.findBookings(orgId, startToday, endToday),
            this.repository.findLocations(orgId),
            this.repository.findShifts(orgId, startToday, endToday),
            this.repository.findCompletedByUser(orgId, userExtId, startToday, endToday)
        ]);

        const totalTables = this.sumTables(locations);
        const statuses = new Map<number, ShiftBookingStatus>();

        for (const booking of bookings) {
            statuses.set(booking.id, this.toShiftStatus(booking, now));
        }

        const activeBookings = this.active(bookings);
        const busyTables = new Set<number>();

        for (const booking of activeBookings) {
            if (statuses.get(booking.id) === 'За столом' && booking.tableId) {
                busyTables.add(booking.tableId);
            }
        }

        const expectedArrivals = [...statuses.values()].filter(
            status => status === 'Ожидается'
        ).length;
        const cancellations = bookings.filter(
            booking => booking.status === BookingStatus.Cancelled
        ).length;
        const averageVisitMinutes = this.averageVisitMinutes(bookings);

        const personalBookings = bookings.filter(booking => booking.userExtId === userExtId);
        const personalActive = this.active(personalBookings);
        // Выручка «за сегодня» — по времени закрытия чека, а не по времени брони.
        const personalRevenueBookings = this.revenue(completedToday);
        const personalRevenue = this.sumAmount(personalRevenueBookings);

        const personalShifts = shifts.filter(shift => shift.userExtId === userExtId);
        const activePersonalShift = personalShifts.find(
            shift => shift.actualStartedAt && !shift.actualEndedAt
        );
        const lastActualShift =
            personalShifts
                .filter(shift => shift.actualStartedAt)
                .sort(
                    (left, right) =>
                        right.actualStartedAt!.getTime() -
                        left.actualStartedAt!.getTime()
                )[0] ?? null;
        const currentShift = activePersonalShift ?? lastActualShift;
        const shiftStart = currentShift?.actualStartedAt ?? null;
        const shiftEnd = currentShift
            ? currentShift.actualEndedAt ?? (activePersonalShift ? now : shiftStart)
            : null;
        const shiftScheduledPersonal =
            shiftStart && shiftEnd
                ? personalBookings.filter(
                      booking =>
                          booking.scheduledAt.getTime() >= shiftStart.getTime() &&
                          booking.scheduledAt.getTime() <= shiftEnd.getTime() &&
                          (!booking.completedAt ||
                              booking.completedAt.getTime() >= shiftStart.getTime())
                  )
                : [];
        const shiftCompletedPersonal =
            shiftStart && shiftEnd
                ? completedToday.filter(
                      booking =>
                          booking.completedAt !== null &&
                          booking.completedAt.getTime() >= shiftStart.getTime() &&
                          booking.completedAt.getTime() <= shiftEnd.getTime()
                  )
                : [];
        const shiftBookingsMap = new Map<number, DashboardBooking>();

        for (const booking of [...shiftScheduledPersonal, ...shiftCompletedPersonal]) {
            shiftBookingsMap.set(booking.id, booking);
        }

        const shiftPersonalBookings = [...shiftBookingsMap.values()];
        const shiftPersonalActive = this.active(shiftPersonalBookings);
        // Чек, закрытый во время смены, учитывается даже если бронь была на будущее.
        const shiftRevenueBookings = this.revenue(shiftCompletedPersonal);
        const shiftRevenue = this.sumAmount(shiftRevenueBookings);
        const shiftDurationMinutes =
            shiftStart && shiftEnd
                ? Math.max(
                      0,
                      Math.round(
                          (shiftEnd.getTime() - shiftStart.getTime()) / MINUTE_MS
                      )
                  )
                : 0;

        const shiftBookings: ShiftBooking[] = bookings
            .slice()
            .sort((left, right) => left.scheduledAt.getTime() - right.scheduledAt.getTime())
            .map(booking => ({
                id: String(booking.id),
                time: formatTime(booking.scheduledAt),
                endTime: formatTime(
                    new Date(
                        booking.scheduledAt.getTime() +
                            booking.durationMinutes * MINUTE_MS
                    )
                ),
                durationMinutes: booking.durationMinutes,
                locationName: booking.locationName,
                guestName: booking.guestName ?? 'Гость',
                guests: booking.guestsCount,
                table: booking.tableName ?? 'Без стола',
                status: statuses.get(booking.id) ?? 'Ожидается',
                phone: booking.guestPhone ?? undefined,
                isMine: booking.userExtId === userExtId || undefined
            }));

        const staff: ShiftStaff[] = shifts
            .filter(shift => {
                if (shift.actualEndedAt) return false;
                // Свою смену показываем в списке только после фактического старта.
                if (shift.userExtId === userExtId && !shift.actualStartedAt) return false;
                if (shift.actualStartedAt) return true;

                return !shift.endsAt || shift.endsAt.getTime() > now.getTime();
            })
            .map(shift => ({
                id: String(shift.id),
                name: shift.userName,
                role: shift.userPosition ?? 'Сотрудник',
                timeRange: shift.actualStartedAt
                    ? formatTimeRange(shift.actualStartedAt, shift.actualEndedAt)
                    : formatTimeRange(shift.startsAt, shift.endsAt),
                status: shift.actualStartedAt
                    ? shift.endsAt &&
                      shift.endsAt.getTime() - now.getTime() <= 2 * HOUR_MS
                        ? 'Заканчивает'
                        : 'На смене'
                    : this.staffStatus(shift, now)
            }));

        return {
            generatedAt: now.toISOString(),
            kpi: {
                bookingsToday: activeBookings.length,
                guestsToday: this.sumGuests(activeBookings),
                tablesBusy: busyTables.size,
                tablesTotal: totalTables,
                cancellations,
                expectedArrivals,
                averageVisitMinutes,
                occupancy: totalTables
                    ? Math.min(100, this.round(busyTables.size / totalTables * 100))
                    : 0
            },
            personal: {
                bookings: personalBookings.length,
                guests: this.sumGuests(personalActive),
                revenue: personalRevenue,
                averageCheck: this.averageCheck(
                    personalRevenue,
                    personalRevenueBookings.length
                ),
                cancellations: personalBookings.filter(
                    booking => booking.status === BookingStatus.Cancelled
                ).length,
                averageVisitMinutes:
                    this.averageVisitMinutes(personalBookings) || averageVisitMinutes,
                goal: currentShift?.bookingsGoal || DEFAULT_SHIFT_GOAL,
                shift: {
                    id: currentShift?.id ?? null,
                    isActive: Boolean(activePersonalShift),
                    startedAt: shiftStart?.toISOString() ?? null,
                    endedAt: currentShift?.actualEndedAt?.toISOString() ?? null,
                    durationMinutes: shiftDurationMinutes,
                    bookings: shiftPersonalBookings.length,
                    guests: this.sumGuests(shiftPersonalActive),
                    revenue: shiftRevenue,
                    averageCheck: this.averageCheck(
                        shiftRevenue,
                        shiftRevenueBookings.length
                    ),
                    cancellations:
                        shiftStart && shiftEnd
                            ? personalBookings.filter(
                                  booking =>
                                      booking.status === BookingStatus.Cancelled &&
                                      booking.updatedAt.getTime() >= shiftStart.getTime() &&
                                      booking.updatedAt.getTime() <= shiftEnd.getTime()
                              ).length
                            : 0,
                    averageVisitMinutes: this.averageVisitMinutes(shiftPersonalBookings),
                    goal: currentShift?.bookingsGoal || DEFAULT_SHIFT_GOAL
                }
            },
            bookings: shiftBookings,
            loadByHour: this.buildLoadByHour(activeBookings),
            staff
        };
    }

    /**
     * Кэш дашборда в Redis.
     * refresh=true — принудительно пересчитать и обновить кэш (кнопка «Обновить»).
     * При недоступном Redis дашборд продолжает работать без кэша.
     */
    private async withCache<T>(
        key: string,
        refresh: boolean,
        compute: () => Promise<T>
    ): Promise<T> {
        if (!refresh) {
            try {
                const cached = await this.redis.get(key);

                if (cached) {
                    this.logger.debug(`Dashboard cache hit: key=${key}`);
                    return JSON.parse(cached) as T;
                }
            } catch (error) {
                this.logger.warn(
                    `Dashboard cache read failed: key=${key}, error=${this.errorMessage(error)}`
                );
                try {
                    await this.redis.del(key);
                } catch {
                    // кэш недоступен — не мешаем отдавать данные
                }
            }
        }

        const value = await compute();

        try {
            await this.redis.set(key, JSON.stringify(value), this.cacheTtlSeconds);
            this.logger.debug(
                `Dashboard cache updated: key=${key}, ttl=${this.cacheTtlSeconds}s`
            );
        } catch (error) {
            this.logger.warn(
                `Dashboard cache write failed: key=${key}, error=${this.errorMessage(error)}`
            );
        }

        return value;
    }

    private summaryKey(orgId: number): string {
        return `${CACHE_KEY_PREFIX}:${orgId}:summary`;
    }

    private revenueKey(orgId: number, periodKey: string): string {
        return `${CACHE_KEY_PREFIX}:${orgId}:revenue:${periodKey}`;
    }

    private shiftKey(orgId: number, userExtId: string, version: string): string {
        return `${CACHE_KEY_PREFIX}:${orgId}:shift:${userExtId}:${version}`;
    }

    private errorMessage(error: unknown): string {
        return error instanceof Error ? error.message : String(error);
    }

    private async getContext(authUser: AuthUser) {
        const user = await this.repository.findUserWithOrg(authUser.sub);

        if (!user) {
            throw new ConflictException(ApiErrors.USER_NOT_FOUND);
        }

        if (!user.org || user.org.status !== Activity.Active) {
            throw new ConflictException(ApiErrors.ORG_NOT_FOUND_OR_INACTIVE);
        }

        return {user, org: user.org};
    }

    private buildHourlyRevenue(
        bookings: DashboardBooking[],
        dayStart: Date,
        dayEnd: Date
    ): RevenuePoint[] {
        const points: RevenuePoint[] = [];
        const activeBookings = this.active(bookings).filter(
            booking => booking.scheduledAt >= dayStart && booking.scheduledAt < dayEnd
        );
        const revenueBookings = this.revenue(bookings).filter(booking => {
            const completedAt = this.completionTime(booking);

            return completedAt !== null && completedAt >= dayStart && completedAt < dayEnd;
        });

        for (let hour = REVENUE_DAY_START_HOUR; hour <= REVENUE_DAY_END_HOUR; hour++) {
            const hourRevenue = revenueBookings.filter(booking => {
                const completedAt = this.completionTime(booking);

                return completedAt !== null && getHour(completedAt) === hour;
            });
            const hourBookings = activeBookings.filter(
                booking => getHour(booking.scheduledAt) === hour
            );

            points.push({
                date: formatHourLabel(hour),
                label: formatHourLabel(hour),
                revenue: this.sumAmount(hourRevenue),
                bookings: hourBookings.length
            });
        }

        return points;
    }

    private buildLoadByHour(bookings: DashboardBooking[]): HourLoadPoint[] {
        const counts = new Map<number, number>();

        for (const booking of bookings) {
            const hour = getHour(booking.scheduledAt);

            if (hour >= LOAD_START_HOUR && hour <= LOAD_END_HOUR) {
                counts.set(hour, (counts.get(hour) ?? 0) + 1);
            }
        }

        const points: HourLoadPoint[] = [];

        for (let hour = LOAD_START_HOUR; hour <= LOAD_END_HOUR; hour++) {
            points.push({
                hour: formatHourLabel(hour),
                bookings: counts.get(hour) ?? 0
            });
        }

        return points;
    }

    private buildHeatmap(
        bookings: DashboardBooking[],
        startToday: Date,
        endToday: Date
    ): HeatmapData {
        const start = addDays(startToday, -(HEATMAP_HISTORY_DAYS - 1));
        const hours = Array.from(
            {length: LOAD_END_HOUR - LOAD_START_HOUR + 1},
            (_, index) => LOAD_START_HOUR + index
        );
        const counts = HEATMAP_DAYS.map(() => hours.map(() => 0));

        for (const booking of this.active(bookings)) {
            if (booking.scheduledAt < start || booking.scheduledAt >= endToday) continue;

            const hour = getHour(booking.scheduledAt);
            if (hour < LOAD_START_HOUR || hour > LOAD_END_HOUR) continue;

            counts[getWeekdayIndex(booking.scheduledAt)][hour - LOAD_START_HOUR] += 1;
        }

        const maximum = Math.max(1, ...counts.flat());

        return {
            days: [...HEATMAP_DAYS],
            hours: hours.map(formatHourLabel),
            values: counts.map(row => row.map(value => Math.round(value / maximum * 100)))
        };
    }

    private buildLocationStats(
        locations: DashboardLocation[],
        bookings: DashboardBooking[],
        monthStart: Date,
        endToday: Date,
        prevMonthStart: Date,
        prevMonthEnd: Date
    ): LocationStat[] {
        const completedThisMonth = this.revenue(
            this.completedInRange(bookings, monthStart, endToday)
        );
        const completedPrevMonth = this.revenue(
            this.completedInRange(bookings, prevMonthStart, prevMonthEnd)
        );

        return locations.map(location => {
            const locationMonth = this.inRange(bookings, monthStart, endToday).filter(
                booking => booking.locationId === location.id
            );
            const locationCompleted = completedThisMonth.filter(
                booking => booking.locationId === location.id
            );
            const locationPrevCompleted = completedPrevMonth.filter(
                booking => booking.locationId === location.id
            );
            const activeBookings = this.active(locationMonth);
            const revenue = this.sumAmount(locationCompleted);
            const prevRevenue = this.sumAmount(locationPrevCompleted);

            return {
                id: location.id,
                name: location.name,
                address: location.address,
                revenue,
                bookings: activeBookings.length,
                guests: this.sumGuests(activeBookings),
                averageCheck: this.averageCheck(revenue, locationCompleted.length),
                occupancy: this.averageDailyOccupancy(
                    activeBookings,
                    location.tablesCount,
                    monthStart,
                    endToday
                ),
                trend: this.trend(revenue, prevRevenue)
            };
        });
    }

    private buildEmployeeBookingStats(
        users: DashboardUser[],
        bookings: DashboardBooking[],
        completedToday: DashboardBooking[]
    ): EmployeeBookingStat[] {
        const activeBookings = this.active(bookings);
        const revenueBookings = this.revenue(completedToday);

        return users
            .map(user => {
                const userBookings = activeBookings.filter(
                    booking => booking.userExtId === user.extId
                );
                const userRevenueBookings = revenueBookings.filter(
                    booking => booking.userExtId === user.extId
                );
                const revenue = this.sumAmount(userRevenueBookings);

                return {
                    id: user.extId,
                    name: user.name,
                    role: user.position ?? 'Сотрудник',
                    bookings: userBookings.length,
                    guests: this.sumGuests(userBookings),
                    revenue,
                    averageCheck: this.averageCheck(
                        revenue,
                        userRevenueBookings.length
                    ),
                    cancellations: bookings.filter(
                        booking =>
                            booking.userExtId === user.extId &&
                            booking.status === BookingStatus.Cancelled
                    ).length
                };
            })
            .sort(
                (left, right) =>
                    right.revenue - left.revenue ||
                    right.bookings - left.bookings ||
                    left.name.localeCompare(right.name)
            );
    }

    private buildEmployeeStats(
        monthBookings: DashboardBooking[],
        users: DashboardUser[]
    ): EmployeeStat[] {
        const usersByExtId = new Map(users.map(user => [user.extId, user]));
        const stats = new Map<
            string,
            {bookings: number; guests: number; revenue: number; ratings: number[]}
        >();

        for (const booking of this.active(monthBookings)) {
            if (!usersByExtId.has(booking.userExtId)) continue;

            const item = stats.get(booking.userExtId) ?? {
                bookings: 0,
                guests: 0,
                revenue: 0,
                ratings: []
            };

            item.bookings += 1;
            item.guests += booking.guestsCount;

            if (this.isRevenue(booking)) {
                item.revenue += booking.amount;
                if (booking.rating) item.ratings.push(booking.rating);
            }

            stats.set(booking.userExtId, item);
        }

        return [...stats.entries()]
            .map(([extId, item]) => {
                const user = usersByExtId.get(extId)!;

                return {
                    id: extId,
                    name: user.name,
                    role: user.position ?? 'Сотрудник',
                    bookings: item.bookings,
                    guests: item.guests,
                    revenue: item.revenue,
                    rating: item.ratings.length
                        ? this.round(
                              item.ratings.reduce((sum, value) => sum + value, 0) /
                                  item.ratings.length
                          )
                        : 0
                };
            })
            .sort((left, right) => right.revenue - left.revenue)
            .slice(0, 10);
    }

    private buildSpark(
        bookings: DashboardBooking[],
        firstVisits: Map<string, Date>,
        startToday: Date,
        totalTables: number
    ): DashboardKpi['spark'] {
        const spark: DashboardKpi['spark'] = {
            revenue: [],
            bookings: [],
            guests: [],
            averageCheck: [],
            occupancy: [],
            newGuests: []
        };

        for (let offset = 6; offset >= 0; offset--) {
            const dayStart = addDays(startToday, -offset);
            const dayEnd = addDays(dayStart, 1);
            const dayActive = this.active(this.inRange(bookings, dayStart, dayEnd));
            const dayCompleted = this.revenue(
                this.completedInRange(bookings, dayStart, dayEnd)
            );
            const revenue = this.sumAmount(dayCompleted);

            spark.revenue.push(revenue);
            spark.bookings.push(dayActive.length);
            spark.guests.push(this.sumGuests(dayActive));
            spark.averageCheck.push(this.averageCheck(revenue, dayCompleted.length));
            spark.occupancy.push(this.occupancy(dayActive, totalTables));
            spark.newGuests.push(this.countNewGuests(dayActive, firstVisits, dayStart));
        }

        return spark;
    }

    private averageDailyOccupancy(
        bookings: DashboardBooking[],
        tablesCount: number,
        from: Date,
        to: Date
    ): number {
        if (!tablesCount) return 0;

        let total = 0;
        let days = 0;

        for (let cursor = from; cursor < to; cursor = addDays(cursor, 1)) {
            const dayEnd = addDays(cursor, 1);
            const dayBookings = bookings.filter(
                booking => booking.scheduledAt >= cursor && booking.scheduledAt < dayEnd
            );

            total += this.occupancy(dayBookings, tablesCount);
            days += 1;
        }

        return days ? this.round(total / days) : 0;
    }

    private occupancy(bookings: DashboardBooking[], tablesCount: number): number {
        if (!tablesCount) return 0;

        const tables = new Set<number>();

        for (const booking of bookings) {
            if (booking.tableId) tables.add(booking.tableId);
        }

        return Math.min(100, this.round(tables.size / tablesCount * 100));
    }

    private averageVisitMinutes(bookings: DashboardBooking[]): number {
        const durations = bookings
            .filter(booking => booking.seatedAt && booking.completedAt)
            .map(
                booking =>
                    (booking.completedAt!.getTime() - booking.seatedAt!.getTime()) / MINUTE_MS
            )
            .filter(duration => duration > 0);

        if (!durations.length) return 0;

        return Math.round(
            durations.reduce((sum, duration) => sum + duration, 0) / durations.length
        );
    }

    private toShiftStatus(booking: DashboardBooking, now: Date): ShiftBookingStatus {
        if (booking.status === BookingStatus.Cancelled) return 'Отменена';

        if (booking.status === BookingStatus.Completed || booking.completedAt) {
            return 'Завершена';
        }

        if (booking.seatedAt && booking.seatedAt.getTime() <= now.getTime()) {
            return 'За столом';
        }

        if (booking.scheduledAt.getTime() <= now.getTime()) {
            const minutesAgo = (now.getTime() - booking.scheduledAt.getTime()) / MINUTE_MS;

            return minutesAgo <= 2 * 60 ? 'За столом' : 'Завершена';
        }

        return 'Ожидается';
    }

    private staffStatus(shift: DashboardShift, now: Date): ShiftStaffStatus {
        if (now.getTime() < shift.startsAt.getTime()) return 'Скоро';

        if (
            shift.endsAt &&
            shift.endsAt.getTime() - now.getTime() <= 2 * HOUR_MS
        ) {
            return 'Заканчивает';
        }

        return 'На смене';
    }

    private buildFirstVisits(bookings: DashboardBooking[]): Map<string, Date> {
        const firstVisits = new Map<string, Date>();

        for (const booking of this.active(bookings)) {
            const key = this.guestKey(booking);
            const visitedAt = firstVisits.get(key);

            if (!visitedAt || booking.scheduledAt < visitedAt) {
                firstVisits.set(key, booking.scheduledAt);
            }
        }

        return firstVisits;
    }

    private countNewGuests(
        bookings: DashboardBooking[],
        firstVisits: Map<string, Date>,
        dayStart: Date
    ): number {
        let count = 0;

        for (const key of this.guestKeys(bookings)) {
            const firstVisit = firstVisits.get(key);

            if (firstVisit && firstVisit.getTime() >= dayStart.getTime()) {
                count += 1;
            }
        }

        return count;
    }

    private guestKeys(bookings: DashboardBooking[]): Set<string> {
        return new Set(bookings.map(booking => this.guestKey(booking)));
    }

    private guestKey(booking: DashboardBooking): string {
        return booking.guestPhone ?? booking.guestName ?? `booking-${booking.id}`;
    }

    private inRange(
        bookings: DashboardBooking[],
        from: Date,
        to: Date
    ): DashboardBooking[] {
        return bookings.filter(
            booking => booking.scheduledAt >= from && booking.scheduledAt < to
        );
    }

    /**
     * Время закрытия чека. Для старых/ручных записей со статусом Completed,
     * но без completed_at, используем время брони.
     */
    private completionTime(booking: DashboardBooking): Date | null {
        if (booking.completedAt) return booking.completedAt;
        if (booking.status === BookingStatus.Completed) return booking.scheduledAt;

        return null;
    }

    private completedInRange(
        bookings: DashboardBooking[],
        from: Date,
        to: Date
    ): DashboardBooking[] {
        return bookings.filter(booking => {
            const completedAt = this.completionTime(booking);

            return completedAt !== null && completedAt >= from && completedAt < to;
        });
    }

    private active(bookings: DashboardBooking[]): DashboardBooking[] {
        return bookings.filter(booking => booking.status !== BookingStatus.Cancelled);
    }

    private revenue(bookings: DashboardBooking[]): DashboardBooking[] {
        return bookings.filter(booking => this.isRevenue(booking));
    }

    private isRevenue(booking: DashboardBooking): boolean {
        return (
            booking.status !== BookingStatus.Cancelled &&
            (booking.status === BookingStatus.Completed || booking.completedAt !== null)
        );
    }

    private sumAmount(bookings: DashboardBooking[]): number {
        return bookings.reduce((sum, booking) => sum + booking.amount, 0);
    }

    private sumGuests(bookings: DashboardBooking[]): number {
        return bookings.reduce((sum, booking) => sum + booking.guestsCount, 0);
    }

    private sumTables(locations: DashboardLocation[]): number {
        return locations.reduce((sum, location) => sum + location.tablesCount, 0);
    }

    private averageCheck(revenue: number, bookingsCount: number): number {
        return bookingsCount ? Math.round(revenue / bookingsCount) : 0;
    }

    private compareTeamRows(
        left: TeamRow,
        right: TeamRow,
        key: TeamSortKey,
        order: 'asc' | 'desc'
    ): number {
        let difference = 0;

        if (key === 'name' || key === 'position') {
            difference = left[key].localeCompare(right[key], 'ru');
        } else if (key === 'shift') {
            difference = Number(left.isOnShift) - Number(right.isOnShift);
        } else {
            difference = left[key] - right[key];
        }

        if (difference === 0) {
            return left.name.localeCompare(right.name, 'ru');
        }

        return difference * (order === 'asc' ? 1 : -1);
    }

    private trend(current: number, previous: number): number {
        if (previous === 0) return current === 0 ? 0 : 100;

        return this.round((current - previous) / previous * 100);
    }

    private round(value: number): number {
        return Math.round(value * 10) / 10;
    }
}
